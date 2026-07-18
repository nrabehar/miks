import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { FlowRulesService } from '$/vaults/flow-rules.service';
import { Prisma, type GroupMember } from '$prisma/client';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ListProjectTransactionsQueryDto } from './dto/list-project-transactions-query.dto';
import { RecordProjectEntryDto } from './dto/record-project-entry.dto';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectEntriesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		private readonly flowRules: FlowRulesService,
		private readonly projects: ProjectsService,
	) {}

	async recordRevenue(
		groupId: string,
		projectId: string,
		member: GroupMember,
		dto: RecordProjectEntryDto,
	) {
		return this.recordEntry(groupId, projectId, member, dto, 'PROJECT_REVENUE');
	}

	async recordExpense(
		groupId: string,
		projectId: string,
		member: GroupMember,
		dto: RecordProjectEntryDto,
	) {
		return this.recordEntry(groupId, projectId, member, dto, 'PROJECT_EXPENSE');
	}

	private async recordEntry(
		groupId: string,
		projectId: string,
		member: GroupMember,
		dto: RecordProjectEntryDto,
		sourceType: 'PROJECT_REVENUE' | 'PROJECT_EXPENSE',
	) {
		const project = await this.projects.loadProject(groupId, projectId);

		if (project.status !== 'ACTIVE') {
			throw new UnprocessableEntityException(
				'Only an ACTIVE project can record revenue or expense entries',
			);
		}

		const transactions = await this.prisma.$transaction(
			(tx) =>
				this.flowRules.applyProjectEntryRules(
					tx,
					groupId,
					sourceType,
					projectId,
					new Prisma.Decimal(dto.amount),
					member.userId,
				),
			{ timeout: 15_000 },
		);

		await this.audit.log({
			eventType:
				sourceType === 'PROJECT_REVENUE'
					? 'PROJECT_REVENUE_RECORDED'
					: 'PROJECT_EXPENSE_RECORDED',
			groupId,
			actorId: member.userId,
			payload: {
				projectId,
				amount: dto.amount,
				description: dto.description,
				transactionIds: transactions.map((t) => t.id),
			},
		});

		return transactions;
	}

	async reverse(
		groupId: string,
		projectId: string,
		transactionId: string,
		member: GroupMember,
	) {
		const project = await this.projects.loadProject(groupId, projectId);

		const original = await this.prisma.transaction.findFirst({
			where: { id: transactionId, groupId },
			include: { reversals: true },
		});

		if (!original) {
			throw new NotFoundException('Transaction not found');
		}

		if (
			original.sourceRefId !== project.id ||
			(original.sourceType !== 'PROJECT_REVENUE' &&
				original.sourceType !== 'PROJECT_EXPENSE')
		) {
			throw new UnprocessableEntityException(
				"This transaction is not one of this project's revenue/expense entries",
			);
		}

		if (original.reversals.length > 0) {
			throw new ConflictException(
				'This transaction has already been reversed',
			);
		}

		const reversing = await this.prisma.$transaction(async (tx) => {
			const oppositeDirection =
				original.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';

			if (oppositeDirection === 'DEBIT') {
				// Reversing a CREDIT entry decrements the destination; guard
				// against going negative if it's since been spent down.
				const debited = await tx.vault.updateMany({
					where: {
						id: original.vaultId,
						cachedBalance: { gte: original.amount },
					},
					data: { cachedBalance: { decrement: original.amount } },
				});

				if (debited.count === 0) {
					throw new UnprocessableEntityException(
						'Insufficient balance to reverse this entry',
					);
				}
			} else {
				await tx.vault.update({
					where: { id: original.vaultId },
					data: { cachedBalance: { increment: original.amount } },
				});
			}

			return tx.transaction.create({
				data: {
					groupId,
					vaultId: original.vaultId,
					direction: oppositeDirection,
					amount: original.amount,
					type: original.type,
					sourceType: original.sourceType,
					sourceRefId: original.sourceRefId,
					reversedTransactionId: original.id,
					createdById: member.userId,
				},
			});
		});

		await this.audit.log({
			eventType: 'PROJECT_ENTRY_REVERSED',
			groupId,
			actorId: member.userId,
			payload: {
				projectId,
				originalTransactionId: original.id,
				reversingTransactionId: reversing.id,
			},
		});

		return reversing;
	}

	/**
	 * AC-8: closing an ACTIVE project never moves money; any nonzero balance
	 * left in a project vault stays exactly where it is, an orphaned balance
	 * the group can see and address later (e.g. via a manual entry), never
	 * silently zeroed out.
	 */
	async close(groupId: string, projectId: string, member: GroupMember) {
		await this.projects.loadProject(groupId, projectId);

		// Status conditional update: only proceeds while the project row still
		// reads ACTIVE, so two concurrent close calls, or a close racing a
		// concurrent revenue/expense declaration, cannot both act on the same
		// stale balance.
		const claimed = await this.prisma.project.updateMany({
			where: { id: projectId, groupId, status: 'ACTIVE' },
			data: { status: 'CLOSED' },
		});

		if (claimed.count === 0) {
			throw new ConflictException(
				'Only an ACTIVE project can be closed',
			);
		}

		const closed = await this.prisma.project.findUniqueOrThrow({
			where: { id: projectId },
		});

		await this.audit.log({
			eventType: 'PROJECT_CLOSED',
			groupId,
			actorId: member.userId,
			payload: { projectId },
		});

		return closed;
	}

	async listTransactions(
		groupId: string,
		projectId: string,
		query: ListProjectTransactionsQueryDto,
	) {
		await this.projects.loadProject(groupId, projectId);

		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const where = {
			groupId,
			sourceRefId: projectId,
			...(query.vaultId ? { vaultId: query.vaultId } : {}),
		};

		const [data, total] = await Promise.all([
			this.prisma.transaction.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.transaction.count({ where }),
		]);

		return { data, page, limit, total };
	}
}
