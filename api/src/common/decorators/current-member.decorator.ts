import type { RequestWithMember } from '$common/guards/group-membership.guard';
import type { GroupMember } from '$prisma/client';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentMember = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): GroupMember => {
		const request = ctx.switchToHttp().getRequest<RequestWithMember>();
		return request.groupMember!;
	},
);
