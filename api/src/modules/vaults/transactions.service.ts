import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { Prisma, type GroupMember } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class TransactionsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	async list(groupId: string, query: ListTransactionsQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const where = {
			groupId,
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

	async withdraw(groupId: string, member: GroupMember, dto: WithdrawDto) {
		const vault = await this.prisma.vault.findFirst({
			where: { groupId, memberId: member.id, type: 'WITHDRAWABLE' },
		});

		if (!vault) {
			throw new NotFoundException('Withdrawable vault not found');
		}

		if (new Prisma.Decimal(dto.amount).greaterThan(vault.cachedBalance)) {
			throw new UnprocessableEntityException('Insufficient balance');
		}

		const transaction = await this.prisma.$transaction(async (tx) => {
			await tx.vault.update({
				where: { id: vault.id },
				data: { cachedBalance: { decrement: dto.amount } },
			});

			return tx.transaction.create({
				data: {
					groupId,
					vaultId: vault.id,
					direction: 'DEBIT',
					amount: dto.amount,
					type: 'WITHDRAWAL',
					sourceType: 'WITHDRAWAL',
					sourceRefId: member.id,
					createdById: member.userId,
				},
			});
		});

		await this.audit.log({
			eventType: 'WITHDRAWAL_DECLARED',
			groupId,
			actorId: member.userId,
			payload: { transactionId: transaction.id, amount: dto.amount },
		});

		return transaction;
	}

	async reverse(groupId: string, transactionId: string, member: GroupMember) {
		const original = await this.prisma.transaction.findFirst({
			where: { id: transactionId, groupId },
			include: { vault: true, reversals: true },
		});

		if (!original) {
			throw new NotFoundException('Transaction not found');
		}

		if (original.sourceType === 'CONTRIBUTION') {
			throw new UnprocessableEntityException(
				'A contribution-sourced transaction can only be reversed by reversing the contribution',
			);
		}

		if (original.vault.memberId !== member.id) {
			throw new ForbiddenException(
				"You can only reverse your own withdrawable vault's transaction",
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
			const balanceDelta =
				original.direction === 'CREDIT'
					? new Prisma.Decimal(original.amount).negated()
					: new Prisma.Decimal(original.amount);

			await tx.vault.update({
				where: { id: original.vaultId },
				data: { cachedBalance: { increment: balanceDelta } },
			});

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
			eventType: 'TRANSACTION_REVERSED',
			groupId,
			actorId: member.userId,
			payload: {
				originalTransactionId: original.id,
				reversingTransactionId: reversing.id,
			},
		});

		return reversing;
	}
}
