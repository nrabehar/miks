import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { PrismaService } from '$lib/database/prisma.service';
import {
	GroupMembershipGuard,
	RequestWithMember,
} from './group-membership.guard';

function makeContext(request: Partial<RequestWithMember>): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	} as unknown as ExecutionContext;
}

function makePrisma(member: unknown) {
	return {
		groupMember: {
			findFirst: jest.fn().mockResolvedValue(member),
		},
	} as unknown as PrismaService & {
		groupMember: { findFirst: jest.Mock };
	};
}

describe('GroupMembershipGuard', () => {
	const user = {
		id: 'user-1',
		emailVerified: true,
		email: 'ada@example.test',
		phone: null,
		displayName: 'Ada',
		role: 'USER' as const,
	};

	it('throws ForbiddenException when there is no authenticated user', async () => {
		const prisma = makePrisma(null);
		const guard = new GroupMembershipGuard(prisma);
		const context = makeContext({ params: { id: 'group-1' } });

		await expect(guard.canActivate(context)).rejects.toThrow(
			ForbiddenException,
		);
		expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
	});

	it('throws ForbiddenException when the route has no group id in params', async () => {
		const prisma = makePrisma(null);
		const guard = new GroupMembershipGuard(prisma);
		const context = makeContext({ user, params: {} });

		await expect(guard.canActivate(context)).rejects.toThrow(
			ForbiddenException,
		);
	});

	it('resolves the group id from params.id when params.groupId is absent', async () => {
		const member = { id: 'member-1', groupId: 'group-1', userId: user.id };
		const prisma = makePrisma(member);
		const guard = new GroupMembershipGuard(prisma);
		const request: RequestWithMember = {
			user,
			params: { id: 'group-1' },
		} as unknown as RequestWithMember;

		const result = await guard.canActivate(makeContext(request));

		expect(result).toBe(true);
		expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
			where: { groupId: 'group-1', userId: user.id, status: 'ACTIVE' },
		});
		expect(request.groupMember).toBe(member);
	});

	it('prefers params.groupId over params.id when both are present', async () => {
		const member = { id: 'member-1', groupId: 'group-2', userId: user.id };
		const prisma = makePrisma(member);
		const guard = new GroupMembershipGuard(prisma);
		const request: RequestWithMember = {
			user,
			params: { id: 'some-other-id', groupId: 'group-2' },
		} as unknown as RequestWithMember;

		await guard.canActivate(makeContext(request));

		expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
			where: { groupId: 'group-2', userId: user.id, status: 'ACTIVE' },
		});
	});

	it('throws ForbiddenException when the caller has no active membership for the group', async () => {
		const prisma = makePrisma(null);
		const guard = new GroupMembershipGuard(prisma);
		const context = makeContext({ user, params: { id: 'group-1' } });

		await expect(guard.canActivate(context)).rejects.toThrow(
			ForbiddenException,
		);
	});

	it('rejects a platform ADMIN who is not an active member, with no special case for the role (AC-13)', async () => {
		const admin = { ...user, id: 'admin-1', role: 'ADMIN' as const };
		const prisma = makePrisma(null);
		const guard = new GroupMembershipGuard(prisma);
		const context = makeContext({ user: admin, params: { id: 'group-1' } });

		await expect(guard.canActivate(context)).rejects.toThrow(
			ForbiddenException,
		);
		// The guard's query never references user.role at all: same lookup regardless of role.
		expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
			where: { groupId: 'group-1', userId: admin.id, status: 'ACTIVE' },
		});
	});
});
