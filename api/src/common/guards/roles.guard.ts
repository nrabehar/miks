import { ROLES_KEY } from '$common/decorators/roles.decorator';
import { AppRoleType } from '$prisma/enums';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<AppRoleType[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredRoles || requiredRoles.length === 0) {
			return true;
		}

		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: AuthenticatedUser }>();
		const user = request.user;

		if (!user) {
			throw new ForbiddenException('Not authenticated');
		}

		if (!requiredRoles.includes(user.role)) {
			throw new ForbiddenException('Insufficient role');
		}

		return true;
	}
}
