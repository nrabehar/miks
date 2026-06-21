import {
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly logger = new Logger(JwtAuthGuard.name);

	constructor(private reflector: Reflector) {
		super();
	}

	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		return super.canActivate(context);
	}

	handleRequest<TUser>(
		err: Error | null,
		user: TUser,
		info: Error | null,
		context: ExecutionContext,
	): TUser {
		if (err || !user) {
			const request = context.switchToHttp().getRequest<Request>();
			this.logger.warn(
				`Authentication failed for ${request.method} ${request.url}: ${
					info?.message || err?.message
				}`,
			);
			throw err || new UnauthorizedException('Authentication required');
		}

		return user;
	}
}
