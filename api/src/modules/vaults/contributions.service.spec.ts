import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { Prisma } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { FlowRulesService } from './flow-rules.service';
import { SharesService } from './shares.service';

function makePrisma() {
	const prisma = {
		paymentMethod: { findUnique: jest.fn() },
		contribution: {
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
		},
		transaction: { findMany: jest.fn(), create: jest.fn() },
		vault: { update: jest.fn() },
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		paymentMethod: { findUnique: jest.Mock };
		contribution: {
			create: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			findFirst: jest.Mock;
			update: jest.Mock;
		};
		transaction: { findMany: jest.Mock; create: jest.Mock };
		vault: { update: jest.Mock };
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeFlowRules() {
	return {
		applyContributionRules: jest.fn().mockResolvedValue([]),
	} as unknown as FlowRulesService & { applyContributionRules: jest.Mock };
}

function makeShares() {
	return {
		recompute: jest.fn().mockResolvedValue(undefined),
	} as unknown as SharesService & { recompute: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('ContributionsService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let flowRules: ReturnType<typeof makeFlowRules>;
	let shares: ReturnType<typeof makeShares>;
	let service: ContributionsService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		flowRules = makeFlowRules();
		shares = makeShares();
		service = new ContributionsService(prisma, audit, flowRules, shares);
	});

	describe('create', () => {
		it('rejects an unknown payment method code with 422, before opening the transaction (AC-3)', async () => {
			prisma.paymentMethod.findUnique.mockResolvedValue(null);

			await expect(
				service.create('group-1', member as never, {
					amount: 100,
					paymentMethodCode: 'ZZZ',
				}),
			).rejects.toThrow(UnprocessableEntityException);
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it('records the contribution, recomputes shares before applying flow rules, and returns the resulting transactions (AC-3, AC-5, AC-7)', async () => {
			const created = {
				id: 'contrib-1',
				amount: 1000,
				groupId: 'group-1',
			};
			prisma.contribution.create.mockResolvedValue(created);
			const producedTransactions = [{ id: 'tx-1' }];
			flowRules.applyContributionRules.mockResolvedValue(
				producedTransactions,
			);

			const result = await service.create('group-1', member as never, {
				amount: 1000,
			});

			expect(prisma.contribution.create).toHaveBeenCalledWith({
				data: {
					groupId: 'group-1',
					memberId: 'member-1',
					amount: 1000,
					paymentMethodCode: undefined,
				},
			});
			expect(shares.recompute).toHaveBeenCalledWith(prisma, 'group-1');
			expect(flowRules.applyContributionRules).toHaveBeenCalledWith(
				prisma,
				'group-1',
				created,
				'user-1',
			);
			expect(result).toEqual({
				...created,
				transactions: producedTransactions,
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'CONTRIBUTION_RECORDED',
					groupId: 'group-1',
					payload: { contributionId: 'contrib-1', amount: 1000 },
				}),
			);
		});

		it('gives the contribution transaction a generous timeout for multiple active flow rules (AC-4 regression)', async () => {
			prisma.contribution.create.mockResolvedValue({ id: 'contrib-1' });

			await service.create('group-1', member as never, { amount: 100 });

			const [, options] = prisma.$transaction.mock.calls[0];
			expect(options).toEqual(
				expect.objectContaining({ timeout: expect.any(Number) }),
			);
			expect(options.timeout).toBeGreaterThanOrEqual(10_000);
		});

		it('still records a contribution with zero transactions when no rule is active (AC-6)', async () => {
			prisma.contribution.create.mockResolvedValue({ id: 'contrib-1' });
			flowRules.applyContributionRules.mockResolvedValue([]);

			const result = await service.create('group-1', member as never, {
				amount: 500,
			});

			expect(result.transactions).toEqual([]);
		});
	});

	describe('list', () => {
		it("paginates a group's contributions", async () => {
			prisma.contribution.findMany.mockResolvedValue([
				{ id: 'contrib-1' },
			]);
			prisma.contribution.count.mockResolvedValue(1);

			const result = await service.list('group-1', {
				page: 1,
				limit: 20,
			});

			expect(result).toEqual({
				data: [{ id: 'contrib-1' }],
				page: 1,
				limit: 20,
				total: 1,
			});
		});
	});

	describe('reverse', () => {
		it('throws NotFoundException when the contribution does not exist in the group', async () => {
			prisma.contribution.findFirst.mockResolvedValue(null);

			await expect(
				service.reverse('group-1', 'missing', member as never),
			).rejects.toThrow(NotFoundException);
		});

		it("rejects reversing another member's contribution with 403 (AC-14)", async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'someone-else',
				reversedAt: null,
			});

			await expect(
				service.reverse('group-1', 'contrib-1', member as never),
			).rejects.toThrow(ForbiddenException);
		});

		it('rejects reversing an already reversed contribution with 409 (AC-14)', async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'member-1',
				reversedAt: new Date(),
			});

			await expect(
				service.reverse('group-1', 'contrib-1', member as never),
			).rejects.toThrow(ConflictException);
		});

		it("offsets every one of the contribution's still-active transactions in one call, sets reversedAt, and recomputes shares (AC-14)", async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'member-1',
				reversedAt: null,
			});
			prisma.transaction.findMany.mockResolvedValue([
				{
					id: 'tx-1',
					vaultId: 'vault-a',
					direction: 'CREDIT',
					amount: new Prisma.Decimal(700),
					type: 'INTERNAL_FLOW',
				},
				{
					id: 'tx-2',
					vaultId: 'vault-b',
					direction: 'CREDIT',
					amount: new Prisma.Decimal(300),
					type: 'INTERNAL_FLOW',
				},
			]);
			prisma.transaction.create.mockImplementation(({ data }) => data);
			prisma.contribution.update.mockResolvedValue({
				id: 'contrib-1',
				reversedAt: new Date('2026-01-01'),
			});

			const result = await service.reverse(
				'group-1',
				'contrib-1',
				member as never,
			);

			expect(prisma.transaction.findMany).toHaveBeenCalledWith({
				where: {
					groupId: 'group-1',
					sourceType: 'CONTRIBUTION',
					sourceRefId: 'contrib-1',
					reversedTransactionId: null,
					reversals: { none: {} },
				},
			});
			expect(prisma.vault.update).toHaveBeenCalledTimes(2);
			expect(prisma.vault.update).toHaveBeenCalledWith({
				where: { id: 'vault-a' },
				data: { cachedBalance: { increment: expect.anything() } },
			});
			expect(result.transactions).toHaveLength(2);
			expect(result.transactions[0]).toEqual(
				expect.objectContaining({
					direction: 'DEBIT',
					reversedTransactionId: 'tx-1',
				}),
			);
			expect(prisma.contribution.update).toHaveBeenCalledWith({
				where: { id: 'contrib-1' },
				data: { reversedAt: expect.any(Date) },
			});
			expect(shares.recompute).toHaveBeenCalledWith(prisma, 'group-1');
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'CONTRIBUTION_REVERSED' }),
			);
		});

		it('reverses a contribution that produced zero transactions with nothing to offset (AC-6, AC-14)', async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'member-1',
				reversedAt: null,
			});
			prisma.transaction.findMany.mockResolvedValue([]);
			prisma.contribution.update.mockResolvedValue({
				id: 'contrib-1',
				reversedAt: new Date(),
			});

			const result = await service.reverse(
				'group-1',
				'contrib-1',
				member as never,
			);

			expect(result.transactions).toEqual([]);
			expect(prisma.vault.update).not.toHaveBeenCalled();
			expect(shares.recompute).toHaveBeenCalled();
		});

		it('only considers original distribution transactions, excluding rows that are themselves a reversal, so a transaction already reversed through the single-transaction endpoint is never reversed a second time here (AC-14 regression)', async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'member-1',
				reversedAt: null,
			});
			prisma.transaction.findMany.mockResolvedValue([]);
			prisma.contribution.update.mockResolvedValue({ id: 'contrib-1' });

			await service.reverse('group-1', 'contrib-1', member as never);

			const where = prisma.transaction.findMany.mock.calls[0][0].where;
			expect(where.reversedTransactionId).toBeNull();
			expect(where.reversals).toEqual({ none: {} });
		});

		it('gives the reversal transaction a generous timeout, matching create() (AC-4 regression)', async () => {
			prisma.contribution.findFirst.mockResolvedValue({
				id: 'contrib-1',
				memberId: 'member-1',
				reversedAt: null,
			});
			prisma.transaction.findMany.mockResolvedValue([]);
			prisma.contribution.update.mockResolvedValue({ id: 'contrib-1' });

			await service.reverse('group-1', 'contrib-1', member as never);

			const [, options] = prisma.$transaction.mock.calls[0];
			expect(options.timeout).toBeGreaterThanOrEqual(10_000);
		});
	});
});
