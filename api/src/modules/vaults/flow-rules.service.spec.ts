import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { Prisma } from '$prisma/client';
import {
	ConflictException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { FlowRulesService } from './flow-rules.service';

function makePrisma() {
	const prisma = {
		flowRule: {
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
		},
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		flowRule: {
			create: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			findFirst: jest.Mock;
			update: jest.Mock;
		};
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeTx() {
	return {
		flowRule: { findMany: jest.fn() },
		vault: { update: jest.fn() },
		transaction: {
			create: jest.fn((args: { data: unknown }) => args.data),
		},
		memberShareCache: { findMany: jest.fn() },
	};
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('FlowRulesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: FlowRulesService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new FlowRulesService(prisma, audit);
	});

	describe('create', () => {
		it('rejects destinations that do not sum to exactly 100 (AC-4)', async () => {
			await expect(
				service.create('group-1', member as never, {
					sourceType: 'CONTRIBUTION',
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-1',
							percentage: 99,
						},
					],
				}),
			).rejects.toThrow(UnprocessableEntityException);
			expect(prisma.flowRule.create).not.toHaveBeenCalled();
		});

		it('rejects a VAULT destination missing a vaultId (AC-4)', async () => {
			await expect(
				service.create('group-1', member as never, {
					sourceType: 'CONTRIBUTION',
					destinations: [
						{ destinationType: 'VAULT', percentage: 100 } as never,
					],
				}),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('creates the rule with destinations in submitted order and logs FLOW_RULE_CREATED (AC-4)', async () => {
			const created = { id: 'rule-1', destinations: [] };
			prisma.flowRule.create.mockResolvedValue(created);

			const result = await service.create('group-1', member as never, {
				sourceType: 'CONTRIBUTION',
				destinations: [
					{
						destinationType: 'VAULT',
						vaultId: 'vault-1',
						percentage: 70,
					},
					{
						destinationType: 'MEMBER_WITHDRAWABLE_VAULTS',
						percentage: 30,
					},
				],
			});

			expect(result).toBe(created);
			expect(prisma.flowRule.create).toHaveBeenCalledWith({
				data: {
					groupId: 'group-1',
					name: undefined,
					sourceType: 'CONTRIBUTION',
					destinations: {
						create: [
							{
								destinationType: 'VAULT',
								vaultId: 'vault-1',
								percentage: 70,
								sortOrder: 0,
							},
							{
								destinationType: 'MEMBER_WITHDRAWABLE_VAULTS',
								vaultId: null,
								percentage: 30,
								sortOrder: 1,
							},
						],
					},
				},
				include: { destinations: true },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'FLOW_RULE_CREATED',
					groupId: 'group-1',
				}),
			);
		});
	});

	describe('replace', () => {
		it('throws NotFoundException when the rule does not exist in the group (AC-8)', async () => {
			prisma.flowRule.findFirst.mockResolvedValue(null);

			await expect(
				service.replace('group-1', 'missing-rule', member as never, {
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-1',
							percentage: 100,
						},
					],
				}),
			).rejects.toThrow(NotFoundException);
		});

		it('rejects replacing an already inactive rule with 409 (AC-8)', async () => {
			prisma.flowRule.findFirst
				.mockResolvedValueOnce({ id: 'rule-1', active: false })
				.mockResolvedValueOnce(null);

			await expect(
				service.replace('group-1', 'rule-1', member as never, {
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-1',
							percentage: 100,
						},
					],
				}),
			).rejects.toThrow(ConflictException);
		});

		it('rejects a rule already pointed to by a replacement with 409 (AC-8)', async () => {
			prisma.flowRule.findFirst
				.mockResolvedValueOnce({ id: 'rule-1', active: true })
				.mockResolvedValueOnce({
					id: 'rule-2',
					replacesRuleId: 'rule-1',
				});

			await expect(
				service.replace('group-1', 'rule-1', member as never, {
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-1',
							percentage: 100,
						},
					],
				}),
			).rejects.toThrow(ConflictException);
		});

		it('deactivates the old rule and creates a new one linked via replacesRuleId (AC-8)', async () => {
			prisma.flowRule.findFirst
				.mockResolvedValueOnce({
					id: 'rule-1',
					active: true,
					name: null,
					sourceType: 'CONTRIBUTION',
				})
				.mockResolvedValueOnce(null);
			const newRule = { id: 'rule-2', replacesRuleId: 'rule-1' };
			prisma.flowRule.create.mockResolvedValue(newRule);

			const result = await service.replace(
				'group-1',
				'rule-1',
				member as never,
				{
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-1',
							percentage: 100,
						},
					],
				},
			);

			expect(result).toBe(newRule);
			expect(prisma.flowRule.update).toHaveBeenCalledWith({
				where: { id: 'rule-1' },
				data: { active: false },
			});
			expect(prisma.flowRule.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						groupId: 'group-1',
						sourceType: 'CONTRIBUTION',
						replacesRuleId: 'rule-1',
					}),
				}),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'FLOW_RULE_REPLACED' }),
			);
		});
	});

	describe('applyContributionRules', () => {
		it('returns no transactions when no CONTRIBUTION rule is active (AC-6)', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(1000) } as never,
				'user-1',
			);

			expect(result).toEqual([]);
		});

		it('splits a contribution across VAULT destinations, remainder to the last one (AC-5)', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([
				{
					id: 'rule-1',
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-a',
							percentage: new Prisma.Decimal(33.33),
						},
						{
							destinationType: 'VAULT',
							vaultId: 'vault-b',
							percentage: new Prisma.Decimal(33.33),
						},
						{
							destinationType: 'VAULT',
							vaultId: 'vault-c',
							percentage: new Prisma.Decimal(33.34),
						},
					],
				},
			]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(10) } as never,
				'user-1',
			);

			expect(
				result.map((r: never) =>
					(r as { amount: Prisma.Decimal }).amount.toString(),
				),
			).toEqual(['3.33', '3.33', '3.34']);
			const total = result.reduce(
				(sum: Prisma.Decimal, r: never) =>
					sum.plus((r as { amount: Prisma.Decimal }).amount),
				new Prisma.Decimal(0),
			);
			expect(total.toString()).toBe('10');
		});

		it('skips a destination whose computed share rounds to zero, creating no transaction for it (AC-5)', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([
				{
					id: 'rule-1',
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-a',
							percentage: new Prisma.Decimal(0),
						},
						{
							destinationType: 'VAULT',
							vaultId: 'vault-b',
							percentage: new Prisma.Decimal(100),
						},
					],
				},
			]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(50) } as never,
				'user-1',
			);

			expect(result).toHaveLength(1);
			expect((result[0] as unknown as { vaultId: string }).vaultId).toBe(
				'vault-b',
			);
			expect(tx.vault.update).toHaveBeenCalledTimes(1);
		});

		it('applies every active rule independently, each producing its own full set of transactions (AC-4)', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([
				{
					id: 'rule-1',
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-a',
							percentage: new Prisma.Decimal(100),
						},
					],
				},
				{
					id: 'rule-2',
					destinations: [
						{
							destinationType: 'VAULT',
							vaultId: 'vault-b',
							percentage: new Prisma.Decimal(100),
						},
					],
				},
			]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(100) } as never,
				'user-1',
			);

			expect(result).toHaveLength(2);
			expect(tx.vault.update).toHaveBeenCalledTimes(2);
		});

		it('splits a MEMBER_WITHDRAWABLE_VAULTS destination across active members by share, skipping zero share members and members without a vault (AC-5, AC-7)', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([
				{
					id: 'rule-1',
					destinations: [
						{
							destinationType: 'MEMBER_WITHDRAWABLE_VAULTS',
							vaultId: null,
							percentage: new Prisma.Decimal(100),
						},
					],
				},
			]);
			tx.memberShareCache.findMany.mockResolvedValue([
				{
					memberId: 'member-a',
					percentage: new Prisma.Decimal(30),
					member: { withdrawableVault: { id: 'vault-a' } },
				},
				{
					memberId: 'member-b',
					percentage: new Prisma.Decimal(0),
					member: { withdrawableVault: { id: 'vault-b' } },
				},
				{
					memberId: 'member-c',
					percentage: new Prisma.Decimal(70),
					member: { withdrawableVault: null },
				},
				{
					memberId: 'member-d',
					percentage: new Prisma.Decimal(70),
					member: { withdrawableVault: { id: 'vault-d' } },
				},
			]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(100) } as never,
				'user-1',
			);

			// Only member-a (30%, has vault) and member-d (70%, has vault) qualify;
			// member-b is filtered for zero share, member-c for having no vault.
			expect(result).toHaveLength(2);
			const amounts = result.map(
				(r: never) => r as { amount: Prisma.Decimal; vaultId: string },
			);
			expect(
				amounts.find((a) => a.vaultId === 'vault-a')?.amount.toString(),
			).toBe('30');
			expect(
				amounts.find((a) => a.vaultId === 'vault-d')?.amount.toString(),
			).toBe('70');
		});

		it('returns no transactions when no active member qualifies for a MEMBER_WITHDRAWABLE_VAULTS split', async () => {
			const tx = makeTx();
			tx.flowRule.findMany.mockResolvedValue([
				{
					id: 'rule-1',
					destinations: [
						{
							destinationType: 'MEMBER_WITHDRAWABLE_VAULTS',
							vaultId: null,
							percentage: new Prisma.Decimal(100),
						},
					],
				},
			]);
			tx.memberShareCache.findMany.mockResolvedValue([]);

			const result = await service.applyContributionRules(
				tx as never,
				'group-1',
				{ id: 'contrib-1', amount: new Prisma.Decimal(100) } as never,
				'user-1',
			);

			expect(result).toEqual([]);
		});
	});
});
