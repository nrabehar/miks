import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { Prisma } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';

function makePrisma() {
	const prisma = {
		transaction: {
			findMany: jest.fn(),
			count: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
		},
		vault: { findFirst: jest.fn(), update: jest.fn() },
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		transaction: {
			findMany: jest.Mock;
			count: jest.Mock;
			findFirst: jest.Mock;
			create: jest.Mock;
		};
		vault: { findFirst: jest.Mock; update: jest.Mock };
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('TransactionsService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: TransactionsService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new TransactionsService(prisma, audit);
	});

	describe('list', () => {
		it('paginates the full group ledger when no vaultId filter is given (AC-12)', async () => {
			prisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }]);
			prisma.transaction.count.mockResolvedValue(1);

			const result = await service.list('group-1', {
				page: 1,
				limit: 20,
			});

			expect(result).toEqual({
				data: [{ id: 'tx-1' }],
				page: 1,
				limit: 20,
				total: 1,
			});
			expect(prisma.transaction.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { groupId: 'group-1' } }),
			);
		});

		it('filters the ledger by vaultId when given (AC-12)', async () => {
			prisma.transaction.findMany.mockResolvedValue([]);
			prisma.transaction.count.mockResolvedValue(0);

			await service.list('group-1', {
				page: 1,
				limit: 20,
				vaultId: 'vault-a',
			});

			expect(prisma.transaction.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { groupId: 'group-1', vaultId: 'vault-a' },
				}),
			);
		});
	});

	describe('withdraw', () => {
		it("throws NotFoundException when the caller's withdrawable vault does not exist", async () => {
			prisma.vault.findFirst.mockResolvedValue(null);

			await expect(
				service.withdraw('group-1', member as never, { amount: 100 }),
			).rejects.toThrow(NotFoundException);
		});

		it('rejects a withdrawal exceeding the current balance with 422, creating no transaction (AC-9)', async () => {
			prisma.vault.findFirst.mockResolvedValue({
				id: 'vault-1',
				cachedBalance: new Prisma.Decimal(50),
			});

			await expect(
				service.withdraw('group-1', member as never, { amount: 100 }),
			).rejects.toThrow(UnprocessableEntityException);
			expect(prisma.transaction.create).not.toHaveBeenCalled();
		});

		it('debits the vault and records a WITHDRAWAL transaction within balance (AC-9)', async () => {
			prisma.vault.findFirst.mockResolvedValue({
				id: 'vault-1',
				cachedBalance: new Prisma.Decimal(100),
			});
			const created = { id: 'tx-1', direction: 'DEBIT', amount: 40 };
			prisma.transaction.create.mockResolvedValue(created);

			const result = await service.withdraw('group-1', member as never, {
				amount: 40,
			});

			expect(result).toBe(created);
			expect(prisma.vault.update).toHaveBeenCalledWith({
				where: { id: 'vault-1' },
				data: { cachedBalance: { decrement: 40 } },
			});
			expect(prisma.transaction.create).toHaveBeenCalledWith({
				data: {
					groupId: 'group-1',
					vaultId: 'vault-1',
					direction: 'DEBIT',
					amount: 40,
					type: 'WITHDRAWAL',
					sourceType: 'WITHDRAWAL',
					sourceRefId: 'member-1',
					createdById: 'user-1',
				},
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'WITHDRAWAL_DECLARED' }),
			);
		});

		it('allows a withdrawal exactly equal to the current balance (boundary)', async () => {
			prisma.vault.findFirst.mockResolvedValue({
				id: 'vault-1',
				cachedBalance: new Prisma.Decimal(40),
			});
			prisma.transaction.create.mockResolvedValue({ id: 'tx-1' });

			await expect(
				service.withdraw('group-1', member as never, { amount: 40 }),
			).resolves.toBeDefined();
		});
	});

	describe('reverse', () => {
		it('throws NotFoundException when the transaction does not exist in the group', async () => {
			prisma.transaction.findFirst.mockResolvedValue(null);

			await expect(
				service.reverse('group-1', 'missing', member as never),
			).rejects.toThrow(NotFoundException);
		});

		it('rejects a CONTRIBUTION-sourced transaction with 422, checking sourceType rather than type (AC-14 regression)', async () => {
			// type is INTERNAL_FLOW (how flow-distributed transactions are actually
			// stored); only sourceType traces back to the contribution. A check on
			// `.type === 'CONTRIBUTION'` would never fire here and wrongly let this
			// through, which was the exact bug /debug fixed.
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'tx-1',
				type: 'INTERNAL_FLOW',
				sourceType: 'CONTRIBUTION',
				vault: { memberId: 'member-1' },
				reversals: [],
			});

			await expect(
				service.reverse('group-1', 'tx-1', member as never),
			).rejects.toThrow(UnprocessableEntityException);
			expect(prisma.transaction.create).not.toHaveBeenCalled();
		});

		it("rejects reversing another member's transaction with 403 (AC-11)", async () => {
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'tx-1',
				type: 'WITHDRAWAL',
				sourceType: 'WITHDRAWAL',
				vault: { memberId: 'someone-else' },
				reversals: [],
			});

			await expect(
				service.reverse('group-1', 'tx-1', member as never),
			).rejects.toThrow(ForbiddenException);
		});

		it('rejects reversing an already reversed transaction with 409 (AC-11)', async () => {
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'tx-1',
				type: 'WITHDRAWAL',
				sourceType: 'WITHDRAWAL',
				vault: { memberId: 'member-1' },
				reversals: [{ id: 'tx-2' }],
			});

			await expect(
				service.reverse('group-1', 'tx-1', member as never),
			).rejects.toThrow(ConflictException);
		});

		it("reverses the caller's own withdrawal, crediting back the vault (AC-11)", async () => {
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'tx-1',
				vaultId: 'vault-1',
				direction: 'DEBIT',
				amount: new Prisma.Decimal(40),
				type: 'WITHDRAWAL',
				sourceType: 'WITHDRAWAL',
				sourceRefId: 'member-1',
				vault: { memberId: 'member-1' },
				reversals: [],
			});
			prisma.transaction.create.mockImplementation(({ data }) => data);

			const result = await service.reverse(
				'group-1',
				'tx-1',
				member as never,
			);

			expect(prisma.vault.update).toHaveBeenCalledWith({
				where: { id: 'vault-1' },
				data: { cachedBalance: { increment: expect.anything() } },
			});
			expect(result).toEqual(
				expect.objectContaining({
					direction: 'CREDIT',
					reversedTransactionId: 'tx-1',
				}),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'TRANSACTION_REVERSED' }),
			);
		});
	});
});
