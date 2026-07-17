import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { VaultsService } from './vaults.service';

function makePrisma() {
	const prisma = {
		vault: {
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			findFirst: jest.fn(),
		},
	};

	return prisma as unknown as PrismaService & {
		vault: {
			create: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			findFirst: jest.Mock;
		};
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('VaultsService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: VaultsService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new VaultsService(prisma, audit);
	});

	describe('createGroupVault', () => {
		it('creates a GROUP vault and logs VAULT_CREATED (AC-1)', async () => {
			const vault = {
				id: 'vault-1',
				groupId: 'group-1',
				name: 'Reserve',
			};
			prisma.vault.create.mockResolvedValue(vault);

			const result = await service.createGroupVault(
				'group-1',
				member as never,
				{
					name: 'Reserve',
				},
			);

			expect(result).toBe(vault);
			expect(prisma.vault.create).toHaveBeenCalledWith({
				data: { groupId: 'group-1', type: 'GROUP', name: 'Reserve' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'VAULT_CREATED',
					groupId: 'group-1',
					actorId: 'user-1',
				}),
			);
		});
	});

	describe('list', () => {
		it("paginates a group's vaults", async () => {
			prisma.vault.findMany.mockResolvedValue([{ id: 'vault-1' }]);
			prisma.vault.count.mockResolvedValue(1);

			const result = await service.list('group-1', {
				page: 1,
				limit: 20,
			});

			expect(result).toEqual({
				data: [{ id: 'vault-1' }],
				page: 1,
				limit: 20,
				total: 1,
			});
			expect(prisma.vault.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { groupId: 'group-1' },
					skip: 0,
					take: 20,
				}),
			);
		});

		it('defaults to page 1 and limit 20 when the query is empty', async () => {
			prisma.vault.findMany.mockResolvedValue([]);
			prisma.vault.count.mockResolvedValue(0);

			await service.list('group-1', {});

			expect(prisma.vault.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 0, take: 20 }),
			);
		});
	});

	describe('get', () => {
		it('returns the vault when it belongs to the group', async () => {
			const vault = { id: 'vault-1', groupId: 'group-1' };
			prisma.vault.findFirst.mockResolvedValue(vault);

			const result = await service.get('group-1', 'vault-1');

			expect(result).toBe(vault);
		});

		it('throws NotFoundException when the vault does not exist in the group', async () => {
			prisma.vault.findFirst.mockResolvedValue(null);

			await expect(service.get('group-1', 'missing')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('createWithdrawableVault', () => {
		it('creates a WITHDRAWABLE vault scoped to the member, inside the given transaction client (AC-2)', async () => {
			const tx = { vault: { create: jest.fn() } };

			await service.createWithdrawableVault(
				tx as never,
				'group-1',
				'member-1',
			);

			expect(tx.vault.create).toHaveBeenCalledWith({
				data: {
					groupId: 'group-1',
					type: 'WITHDRAWABLE',
					name: 'Withdrawable',
					memberId: 'member-1',
				},
			});
		});
	});
});
