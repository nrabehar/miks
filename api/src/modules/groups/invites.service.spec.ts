import { AuditService } from '$lib/audit/audit.service';
import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { NotificationDeliveryService } from '$lib/notification-delivery/notification-delivery.service';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { GroupsService } from './groups.service';

function makePrisma() {
	const prisma = {
		groupMember: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
		groupInvite: {
			findFirst: jest.fn(),
			create: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
			delete: jest.fn(),
		},
		group: { findUniqueOrThrow: jest.fn() },
		$transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		groupMember: {
			findFirst: jest.Mock;
			findUniqueOrThrow: jest.Mock;
			create: jest.Mock;
		};
		groupInvite: {
			findFirst: jest.Mock;
			create: jest.Mock;
			delete: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			update: jest.Mock;
			updateMany: jest.Mock;
		};
		group: { findUniqueOrThrow: jest.Mock };
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService & {
		log: jest.Mock;
	};
}

function makeNotifications() {
	return {
		sendCode: jest.fn().mockResolvedValue(undefined),
	} as unknown as NotificationDeliveryService & { sendCode: jest.Mock };
}

function makeConfig(): ConfigService {
	return {
		oauth: { webUrl: 'http://localhost:5173' },
		groups: { inviteExpiryDays: 7 },
	} as unknown as ConfigService;
}

function makeGroups() {
	return {
		assertNotClosed: jest.fn().mockResolvedValue(undefined),
	} as unknown as GroupsService & { assertNotClosed: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('InvitesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let notifications: ReturnType<typeof makeNotifications>;
	let groups: ReturnType<typeof makeGroups>;
	let service: InvitesService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		notifications = makeNotifications();
		groups = makeGroups();
		service = new InvitesService(
			prisma,
			notifications,
			makeConfig(),
			audit,
			groups as unknown as GroupsService,
		);
	});

	describe('create', () => {
		it('creates a pending invite and sends it by email (AC-2)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue(null);
			prisma.groupInvite.findFirst.mockResolvedValue(null);
			const invite = { id: 'invite-1', email: 'invitee@example.test' };
			prisma.groupInvite.create.mockResolvedValue(invite);
			prisma.group.findUniqueOrThrow.mockResolvedValue({ name: 'My Group' });

			const result = await service.create(
				'group-1',
				member as never,
				{ email: 'invitee@example.test' },
			);

			expect(result).toBe(invite);
			expect(groups.assertNotClosed).toHaveBeenCalledWith('group-1');
			expect(notifications.sendCode).toHaveBeenCalledWith(
				'invitee@example.test',
				expect.any(String),
				expect.stringContaining('http://localhost:5173/invites/'),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'INVITE_SENT', groupId: 'group-1' }),
			);
		});

		it('rejects inviting an email that already belongs to an active member with 409 (AC-2)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'existing-member' });

			await expect(
				service.create('group-1', member as never, {
					email: 'invitee@example.test',
				}),
			).rejects.toThrow(ConflictException);
			expect(prisma.groupInvite.create).not.toHaveBeenCalled();
		});

		it('rejects a duplicate pending invite for the same email with 409 (AC-2)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue(null);
			prisma.groupInvite.findFirst.mockResolvedValue({ id: 'existing-invite' });

			await expect(
				service.create('group-1', member as never, {
					email: 'invitee@example.test',
				}),
			).rejects.toThrow(ConflictException);
			expect(prisma.groupInvite.create).not.toHaveBeenCalled();
		});

		it('rolls back the created invite when sending the invite email fails, instead of leaving it orphaned (bug repro from /check verify)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue(null);
			prisma.groupInvite.findFirst.mockResolvedValue(null);
			const invite = { id: 'invite-1', email: 'invitee@example.test' };
			prisma.groupInvite.create.mockResolvedValue(invite);
			prisma.group.findUniqueOrThrow.mockResolvedValue({ name: 'My Group' });
			notifications.sendCode.mockRejectedValue(
				new Error('Failed to send email: bounced'),
			);

			await expect(
				service.create('group-1', member as never, {
					email: 'invitee@example.test',
				}),
			).rejects.toThrow('Failed to send email: bounced');

			expect(prisma.groupInvite.delete).toHaveBeenCalledWith({
				where: { id: 'invite-1' },
			});
			// The failed send must not be logged as a successful INVITE_SENT.
			expect(audit.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'INVITE_SENT' }),
			);
		});
	});

	describe('revoke', () => {
		it('revokes a pending invite (AC-4)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				status: 'PENDING',
			});

			await service.revoke('group-1', 'invite-1', member as never);

			expect(prisma.groupInvite.update).toHaveBeenCalledWith({
				where: { id: 'invite-1' },
				data: { status: 'REVOKED' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'INVITE_REVOKED' }),
			);
		});

		it('throws NotFoundException for an invite that does not belong to this group', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue(null);

			await expect(
				service.revoke('group-1', 'nope', member as never),
			).rejects.toThrow(NotFoundException);
		});

		it('throws ConflictException when the invite is no longer pending (AC-4)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				status: 'ACCEPTED',
			});

			await expect(
				service.revoke('group-1', 'invite-1', member as never),
			).rejects.toThrow(ConflictException);
		});
	});

	describe('preview', () => {
		it('returns the group name, inviter, and expiry for a pending invite (AC-2)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'PENDING',
				expiresAt: new Date('2030-01-01'),
				invitedByMemberId: 'member-1',
			});
			prisma.group.findUniqueOrThrow.mockResolvedValue({ name: 'My Group' });
			prisma.groupMember.findUniqueOrThrow.mockResolvedValue({
				user: { displayName: 'Ada' },
			});

			const result = await service.preview('raw-token');

			expect(result).toEqual({
				groupName: 'My Group',
				invitedBy: 'Ada',
				expiresAt: new Date('2030-01-01'),
			});
		});

		it('rejects an unknown token with 404 (AC-5)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue(null);

			await expect(service.preview('nope')).rejects.toThrow(NotFoundException);
		});

		it('rejects an already accepted invite with 404 (AC-5)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'ACCEPTED',
				expiresAt: new Date('2030-01-01'),
			});

			await expect(service.preview('used-token')).rejects.toThrow(
				NotFoundException,
			);
		});

		it('lazily expires and rejects a pending invite past its expiry, logging INVITE_EXPIRED (AC-5, AC-14)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'PENDING',
				expiresAt: new Date('2000-01-01'),
			});

			await expect(service.preview('stale-token')).rejects.toThrow(
				NotFoundException,
			);
			expect(prisma.groupInvite.update).toHaveBeenCalledWith({
				where: { id: 'invite-1' },
				data: { status: 'EXPIRED' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'INVITE_EXPIRED' }),
			);
		});
	});

	describe('accept', () => {
		it('creates a new active membership when the token and email match (AC-3)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'PENDING',
				email: 'invitee@example.test',
				expiresAt: new Date('2030-01-01'),
			});
			prisma.groupInvite.updateMany.mockResolvedValue({ count: 1 });
			const newMember = { id: 'member-2', groupId: 'group-1', userId: 'user-2' };
			prisma.groupMember.create.mockResolvedValue(newMember);

			const result = await service.accept(
				'raw-token',
				'user-2',
				'invitee@example.test',
			);

			expect(result).toBe(newMember);
			expect(prisma.groupInvite.updateMany).toHaveBeenCalledWith({
				where: { id: 'invite-1', status: 'PENDING' },
				data: { status: 'ACCEPTED', acceptedAt: expect.any(Date) },
			});
			expect(prisma.groupMember.create).toHaveBeenCalledWith({
				data: { groupId: 'group-1', userId: 'user-2' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'INVITE_ACCEPTED' }),
			);
		});

		it('rejects when the accepting account email does not match the invite with 403 (AC-3)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'PENDING',
				email: 'invitee@example.test',
				expiresAt: new Date('2030-01-01'),
			});

			await expect(
				service.accept('raw-token', 'user-2', 'someone-else@example.test'),
			).rejects.toThrow(ForbiddenException);
			expect(prisma.groupMember.create).not.toHaveBeenCalled();
		});

		it('rejects re-accepting an already accepted invite with 409 (AC-5)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'ACCEPTED',
				email: 'invitee@example.test',
				expiresAt: new Date('2030-01-01'),
			});

			await expect(
				service.accept('raw-token', 'user-2', 'invitee@example.test'),
			).rejects.toThrow(ConflictException);
		});

		it('treats a lost update race as already used with 409, preventing a duplicate membership (AC-5)', async () => {
			prisma.groupInvite.findFirst.mockResolvedValue({
				id: 'invite-1',
				groupId: 'group-1',
				status: 'PENDING',
				email: 'invitee@example.test',
				expiresAt: new Date('2030-01-01'),
			});
			// Simulates a concurrent accept winning the race: the guarded update matches 0 rows.
			prisma.groupInvite.updateMany.mockResolvedValue({ count: 0 });

			await expect(
				service.accept('raw-token', 'user-2', 'invitee@example.test'),
			).rejects.toThrow(ConflictException);
			expect(prisma.groupMember.create).not.toHaveBeenCalled();
		});
	});
});
