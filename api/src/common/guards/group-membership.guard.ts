import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { PrismaService } from '$lib/database/prisma.service';
import type { GroupMember } from '$prisma/client';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

export type RequestWithMember = Request & {
	user?: AuthenticatedUser;
	groupMember?: GroupMember;
};

/**
 * Resolves the caller's active membership for the :groupId/:id route param.
 * There is no group level role: this guard's pass/fail (active member or
 * not, with no exception for a platform ADMIN) is the entire authorization
 * model for a group scoped route. Runs in addition to, never instead of,
 * JwtAuthGuard.
 */
@Injectable()
export class GroupMembershipGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<RequestWithMember>();
		const user = request.user;

		if (!user) {
			throw new ForbiddenException('Not authenticated');
		}

		const groupId = (request.params.groupId ?? request.params.id) as
			string | undefined;

		if (!groupId) {
			throw new ForbiddenException('No group specified');
		}

		const member = await this.prisma.groupMember.findFirst({
			where: { groupId, userId: user.id, status: 'ACTIVE' },
		});

		if (!member) {
			throw new ForbiddenException('Not an active member of this group');
		}

		request.groupMember = member;

		return true;
	}
}
