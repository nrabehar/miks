import { IS_PUBLIC_KEY } from '$common/decorators/public.decorator';
import {
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AppRoleType } from '$prisma/enums';

export interface AuthenticatedUser {
	id: string;
	email: string | null;
	phone: string | null;
	displayName: string;
	role: AppRoleType;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private readonly reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) {
			return true;
		}

		return super.canActivate(context);
	}

	handleRequest<TUser = AuthenticatedUser>(
		err: Error | null,
		user: TUser,
		info: unknown,
	): TUser {
		if (err) {
			throw err;
		}

		if (!user) {
			throw new UnauthorizedException(
				(info as { message?: string })?.message ?? 'Not authenticated',
			);
		}

		return user;
	}
}
