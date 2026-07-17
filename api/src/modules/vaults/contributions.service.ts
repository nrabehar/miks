import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import { Prisma, type GroupMember, type Transaction } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { FlowRulesService } from './flow-rules.service';
import { SharesService } from './shares.service';

@Injectable()
export class ContributionsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		private readonly flowRules: FlowRulesService,
		private readonly shares: SharesService,
	) {}

	async create(
		groupId: string,
		member: GroupMember,
		dto: CreateContributionDto,
	) {
		if (dto.paymentMethodCode) {
			const paymentMethod = await this.prisma.paymentMethod.findUnique({
				where: { code: dto.paymentMethodCode },
			});

			if (!paymentMethod) {
				throw new UnprocessableEntityException(
					'Unknown payment method code',
				);
			}
		}

		const { contribution, transactions } = await this.prisma.$transaction(
			async (tx) => {
				const created = await tx.contribution.create({
					data: {
						groupId,
						memberId: member.id,
						amount: dto.amount,
						paymentMethodCode: dto.paymentMethodCode,
					},
				});

				// AC-7: shares reflect this contribution's amount before any
				// MEMBER_WITHDRAWABLE_VAULTS flow destination is applied below.
				await this.shares.recompute(tx, groupId);

				const createdTransactions =
					await this.flowRules.applyContributionRules(
						tx,
						groupId,
						created,
						member.userId,
					);

				return {
					contribution: created,
					transactions: createdTransactions,
				};
			},
			// Applying every active CONTRIBUTION rule is several sequential
			// writes per rule (one per destination, plus a per-member split for
			// MEMBER_WITHDRAWABLE_VAULTS); the 5s Prisma default is too tight
			// once more than one rule is active. See spec 0003 AC-4.
			{ timeout: 15_000 },
		);

		await this.audit.log({
			eventType: 'CONTRIBUTION_RECORDED',
			groupId,
			actorId: member.userId,
			payload: { contributionId: contribution.id, amount: dto.amount },
		});

		return { ...contribution, transactions };
	}

	async list(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.contribution.findMany({
				where: { groupId },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { contributedAt: 'desc' },
			}),
			this.prisma.contribution.count({ where: { groupId } }),
		]);

		return { data, page, limit, total };
	}

	async reverse(
		groupId: string,
		contributionId: string,
		member: GroupMember,
	) {
		const contribution = await this.prisma.contribution.findFirst({
			where: { id: contributionId, groupId },
		});

		if (!contribution) {
			throw new NotFoundException('Contribution not found');
		}

		if (contribution.memberId !== member.id) {
			throw new ForbiddenException(
				'You can only reverse your own contribution',
			);
		}

		if (contribution.reversedAt) {
			throw new ConflictException(
				'This contribution has already been reversed',
			);
		}

		const { reversed, offsetting } = await this.prisma.$transaction(
			async (tx) => {
				const originals = await tx.transaction.findMany({
					where: {
						groupId,
						sourceType: 'CONTRIBUTION',
						sourceRefId: contribution.id,
						reversedTransactionId: null,
						reversals: { none: {} },
					},
				});

				const offsettingTransactions: Transaction[] = [];

				for (const original of originals) {
					const oppositeDirection =
						original.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
					const balanceDelta =
						original.direction === 'CREDIT'
							? new Prisma.Decimal(original.amount).negated()
							: new Prisma.Decimal(original.amount);

					await tx.vault.update({
						where: { id: original.vaultId },
						data: { cachedBalance: { increment: balanceDelta } },
					});

					offsettingTransactions.push(
						await tx.transaction.create({
							data: {
								groupId,
								vaultId: original.vaultId,
								direction: oppositeDirection,
								amount: original.amount,
								type: original.type,
								sourceType: 'CONTRIBUTION',
								sourceRefId: contribution.id,
								reversedTransactionId: original.id,
								createdById: member.userId,
							},
						}),
					);
				}

				const reversedContribution = await tx.contribution.update({
					where: { id: contribution.id },
					data: { reversedAt: new Date() },
				});

				await this.shares.recompute(tx, groupId);

				return {
					reversed: reversedContribution,
					offsetting: offsettingTransactions,
				};
			},
			// See the create() transaction above: reversing every one of a
			// contribution's distribution transactions is the same sequential,
			// per-transaction write pattern.
			{ timeout: 15_000 },
		);

		await this.audit.log({
			eventType: 'CONTRIBUTION_REVERSED',
			groupId,
			actorId: member.userId,
			payload: { contributionId: contribution.id },
		});

		return { ...reversed, transactions: offsetting };
	}
}
