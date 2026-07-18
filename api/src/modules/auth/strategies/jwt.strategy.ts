import { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { TokenService } from '$lib/auth-token/token.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		config: ConfigService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: Request) =>
					(request.cookies as Record<string, string> | undefined)?.[
						TokenService.ACCESS_COOKIE
					] ?? null,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			secretOrKey: config.jwt.accessSecret,
		});
	}

	async validate(payload: { sub: string }): Promise<AuthenticatedUser> {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
		});

		if (!user) {
			throw new UnauthorizedException('User no longer exists');
		}

		const localIdentity = await this.prisma.userIdentity.findFirst({
			where: { userId: user.id, providerCode: 'local' },
			select: { emailVerified: true },
		});

		return {
			id: user.id,
			email: user.email,
			phone: user.phone,
			displayName: user.displayName,
			role: user.role,
			emailVerified: localIdentity?.emailVerified ?? true,
		};
	}
}
