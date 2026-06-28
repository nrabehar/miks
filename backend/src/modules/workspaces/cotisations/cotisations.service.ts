import { PrismaService } from '#/core/prisma/prisma.service';
import {
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { CotisationEntryDto } from './dtos/batch-cotisations.dto';

@Injectable()
export class CotisationsService {
	private readonly logger = new Logger(CotisationsService.name);

	constructor(private readonly prisma: PrismaService) {}

	async recordBatch(workspaceId: string, requesterId: string, entries: CotisationEntryDto[]) {
		const requester = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId: requesterId } },
		});
		if (!requester) throw new ForbiddenException('You are not a member of this workspace');
		if (requester.role !== 'admin') throw new ForbiddenException('Only admins can record cotisations');

		const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
		if (!workspace) throw new NotFoundException('Workspace not found');

		const created = await this.prisma.$transaction(async (tx) => {
			const cotisations: Awaited<ReturnType<typeof tx.cotisation.create>>[] = [];

			for (const entry of entries) {
				const member = await tx.workspaceMember.findUnique({
					where: { id: entry.memberId },
				});
				if (!member || member.workspaceId !== workspaceId) {
					throw new NotFoundException(`Member ${entry.memberId} not found in this workspace`);
				}

				const cotisation = await tx.cotisation.create({
					data: {
						workspaceId,
						memberId: entry.memberId,
						amount: entry.amount,
						currency: workspace.currency,
						month: entry.month,
						year: entry.year,
						note: entry.note,
					},
				});
				cotisations.push(cotisation);

				await tx.ledgerEntry.create({
					data: {
						workspaceId,
						type: 'IN',
						vault: 'C1',
						category: 'COTISATION',
						amount: entry.amount,
						currency: workspace.currency,
						referenceId: cotisation.id,
						authorId: requesterId,
					},
				});
			}

			const memberIds = [...new Set(entries.map((e) => e.memberId))];
			for (const memberId of memberIds) {
				const agg = await tx.cotisation.aggregate({
					_sum: { amount: true },
					where: { workspaceId, memberId },
				});
				const total = Number(agg._sum.amount ?? 0);
				await tx.workspaceMember.update({
					where: { id: memberId },
					data: { totalShares: total },
				});
			}

			return cotisations;
		});

		this.logger.log(`Recorded ${created.length} cotisation(s) in workspace ${workspaceId} by ${requesterId}`);
		return created;
	}

	async listByWorkspace(
		workspaceId: string,
		requesterId: string,
		filters?: { month?: number; year?: number },
	) {
		await this.assertMember(workspaceId, requesterId);

		return this.prisma.cotisation.findMany({
			where: {
				workspaceId,
				...(filters?.month !== undefined && { month: filters.month }),
				...(filters?.year !== undefined && { year: filters.year }),
			},
			include: {
				member: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								username: true,
								firstName: true,
								lastName: true,
								avatarUrl: true,
							},
						},
					},
				},
			},
			orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
		});
	}

	async computeEquity(workspaceId: string, requesterId: string) {
		await this.assertMember(workspaceId, requesterId);

		const globalAgg = await this.prisma.cotisation.aggregate({
			_sum: { amount: true },
			where: { workspaceId },
		});
		const globalTotal = Number(globalAgg._sum.amount ?? 0);

		const byMember = await this.prisma.cotisation.groupBy({
			by: ['memberId'],
			_sum: { amount: true },
			where: { workspaceId },
		});

		const members = await this.prisma.workspaceMember.findMany({
			where: { workspaceId },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
						firstName: true,
						lastName: true,
						avatarUrl: true,
					},
				},
			},
		});

		const memberMap = new Map(members.map((m) => [m.id, m]));

		const equity = byMember.map((row) => {
			const totalAmount = Number(row._sum.amount ?? 0);
			const sharePercent = globalTotal > 0 ? (totalAmount / globalTotal) * 100 : 0;
			const member = memberMap.get(row.memberId);
			return { member, totalAmount, sharePercent };
		});

		equity.sort((a, b) => b.sharePercent - a.sharePercent);

		return equity.map((item, index) => {
			const m = item.member;
			const displayName =
				[m?.user?.firstName, m?.user?.lastName].filter(Boolean).join(' ') ||
				m?.user?.username ||
				m?.user?.email ||
				'Membre inconnu';
			return {
				memberId: m?.id ?? '',
				userId: m?.userId ?? '',
				displayName,
				totalAmount: item.totalAmount,
				sharePercent: item.sharePercent,
				rank: index + 1,
			};
		});
	}

	async getSummary(workspaceId: string, requesterId: string) {
		await this.assertMember(workspaceId, requesterId);

		const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
		const currency = workspace?.currency ?? 'MGA';

		const vaultConfig = await this.prisma.vaultConfig.findUnique({ where: { workspaceId } });
		const c1Ratio = Number(vaultConfig?.c1Ratio ?? 60);
		const c2Ratio = Number(vaultConfig?.c2Ratio ?? 30);
		const c3Ratio = Number(vaultConfig?.c3Ratio ?? 10);

		const totalAgg = await this.prisma.cotisation.aggregate({
			_sum: { amount: true },
			where: { workspaceId },
		});
		const totalCaisse = Number(totalAgg._sum.amount ?? 0);

		const c1Balance = (totalCaisse * c1Ratio) / 100;
		const c2Balance = (totalCaisse * c2Ratio) / 100;
		const c3Balance = (totalCaisse * c3Ratio) / 100;

		const memberCount = await this.prisma.workspaceMember.count({ where: { workspaceId } });

		const now = new Date();
		const currentMonth = now.getMonth() + 1;
		const currentYear = now.getFullYear();

		const paidThisMonth = await this.prisma.cotisation.findMany({
			where: { workspaceId, month: currentMonth, year: currentYear },
			select: { memberId: true },
		});
		const uniquePayers = new Set(paidThisMonth.map((c) => c.memberId)).size;
		const cotisationRateThisMonth = memberCount > 0 ? (uniquePayers / memberCount) * 100 : 0;

		const lastCotisation = await this.prisma.cotisation.findFirst({
			where: { workspaceId },
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true },
		});
		const lastCotisationDate = lastCotisation?.createdAt ?? null;

		return {
			totalCaisse,
			c1Balance,
			c2Balance,
			c3Balance,
			memberCount,
			cotisationRateThisMonth,
			lastCotisationDate,
			currency,
		};
	}

	private async assertMember(workspaceId: string, userId: string): Promise<void> {
		const member = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId } },
		});
		if (!member) throw new ForbiddenException('You are not a member of this workspace');
	}
}
