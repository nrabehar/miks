import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import {
	ConflictException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';

function makePrisma() {
	const prisma = {
		currency: { findUnique: jest.fn() },
		group: {
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			findUniqueOrThrow: jest.fn(),
			update: jest.fn(),
		},
		groupMember: {
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			update: jest.fn(),
		},
		$transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		currency: { findUnique: jest.Mock };
		group: {
			create: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			findUniqueOrThrow: jest.Mock;
			update: jest.Mock;
		};
		groupMember: {
			create: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			update: jest.Mock;
		};
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService & {
		log: jest.Mock;
	};
}

describe('GroupsService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: GroupsService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new GroupsService(prisma, audit);
	});

	describe('create', () => {
		it('creates the group and auto-joins the creator as its first active member (AC-1)', async () => {
			prisma.currency.findUnique.mockResolvedValue({ code: 'MGA' });
			const group = { id: 'group-1', name: 'My Group', currencyCode: 'MGA' };
			prisma.group.create.mockResolvedValue(group);
			prisma.groupMember.create.mockResolvedValue({ id: 'member-1' });

			const result = await service.create('user-1', {
				name: 'My Group',
				currencyCode: 'MGA',
			});

			expect(result).toBe(group);
			expect(prisma.group.create).toHaveBeenCalledWith({
				data: {
					name: 'My Group',
					description: undefined,
					currencyCode: 'MGA',
					creatorId: 'user-1',
				},
			});
			expect(prisma.groupMember.create).toHaveBeenCalledWith({
				data: { groupId: 'group-1', userId: 'user-1' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'GROUP_CREATED', groupId: 'group-1' }),
			);
		});

		it('rejects an unknown currency code with 422 (AC-1)', async () => {
			prisma.currency.findUnique.mockResolvedValue(null);

			await expect(
				service.create('user-1', { name: 'My Group', currencyCode: 'ZZZ' }),
			).rejects.toThrow(UnprocessableEntityException);

			expect(prisma.group.create).not.toHaveBeenCalled();
			expect(audit.log).not.toHaveBeenCalled();
		});
	});

	describe('listForUser', () => {
		it('paginates the caller\'s active-membership groups', async () => {
			prisma.group.findMany.mockResolvedValue([{ id: 'group-1' }]);
			prisma.group.count.mockResolvedValue(1);

			const result = await service.listForUser('user-1', { page: 2, limit: 10 });

			expect(result).toEqual({
				data: [{ id: 'group-1' }],
				page: 2,
				limit: 10,
				total: 1,
			});
			expect(prisma.group.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 10, take: 10 }),
			);
		});

		it('defaults to page 1 and limit 20 when the query is empty', async () => {
			prisma.group.findMany.mockResolvedValue([]);
			prisma.group.count.mockResolvedValue(0);

			await service.listForUser('user-1', {});

			expect(prisma.group.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 0, take: 20 }),
			);
		});
	});

	describe('update', () => {
		it('edits name, description, and currency for an open group (AC-12)', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ status: 'ACTIVE' });
			prisma.currency.findUnique.mockResolvedValue({ code: 'USD' });
			const updated = { id: 'group-1', name: 'Renamed' };
			prisma.group.update.mockResolvedValue(updated);

			const result = await service.update('group-1', 'user-1', {
				name: 'Renamed',
				currencyCode: 'USD',
			});

			expect(result).toBe(updated);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'GROUP_EDITED', groupId: 'group-1' }),
			);
		});

		it('rejects editing a closed group with 409 (AC-12)', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ status: 'CLOSED' });

			await expect(
				service.update('group-1', 'user-1', { name: 'Renamed' }),
			).rejects.toThrow(ConflictException);

			expect(prisma.group.update).not.toHaveBeenCalled();
		});

		it('rejects an unknown currency code on edit with 422', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ status: 'ACTIVE' });
			prisma.currency.findUnique.mockResolvedValue(null);

			await expect(
				service.update('group-1', 'user-1', { currencyCode: 'ZZZ' }),
			).rejects.toThrow(UnprocessableEntityException);
		});
	});

	describe('leave', () => {
		it('flips the member to LEFT when other active members remain (AC-7)', async () => {
			prisma.groupMember.count.mockResolvedValue(2);
			const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

			await service.leave('group-1', member as never);

			expect(prisma.groupMember.update).toHaveBeenCalledWith({
				where: { id: 'member-1' },
				data: { status: 'LEFT', leftAt: expect.any(Date) },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_LEFT', groupId: 'group-1' }),
			);
		});

		it('blocks the last remaining active member from leaving with 409 (AC-7)', async () => {
			prisma.groupMember.count.mockResolvedValue(1);
			const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

			await expect(service.leave('group-1', member as never)).rejects.toThrow(
				ConflictException,
			);
			expect(prisma.groupMember.update).not.toHaveBeenCalled();
		});
	});

	describe('close', () => {
		it('closes the group when exactly one active member remains (AC-8)', async () => {
			prisma.groupMember.count.mockResolvedValue(1);
			const closedGroup = { id: 'group-1', status: 'CLOSED' };
			prisma.group.update.mockResolvedValue(closedGroup);
			const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

			const result = await service.close('group-1', member as never);

			expect(result).toBe(closedGroup);
			expect(prisma.group.update).toHaveBeenCalledWith({
				where: { id: 'group-1' },
				data: { status: 'CLOSED', closedAt: expect.any(Date) },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'GROUP_CLOSED', groupId: 'group-1' }),
			);
		});

		it('rejects closing when more than one active member remains with 409 (AC-8)', async () => {
			prisma.groupMember.count.mockResolvedValue(2);
			const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

			await expect(service.close('group-1', member as never)).rejects.toThrow(
				ConflictException,
			);
		});

		it('rejects closing when zero active members remain (defensive) with 409', async () => {
			prisma.groupMember.count.mockResolvedValue(0);
			const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

			await expect(service.close('group-1', member as never)).rejects.toThrow(
				ConflictException,
			);
		});
	});

	describe('assertNotClosed', () => {
		it('resolves without throwing for an active group', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ status: 'ACTIVE' });

			await expect(service.assertNotClosed('group-1')).resolves.toBeUndefined();
		});

		it('throws ConflictException for a closed group', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ status: 'CLOSED' });

			await expect(service.assertNotClosed('group-1')).rejects.toThrow(
				ConflictException,
			);
		});
	});
});
