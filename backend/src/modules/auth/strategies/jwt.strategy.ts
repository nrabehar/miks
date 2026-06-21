import { RedisService } from '#/core/redis/redis.service';
import { SessionService } from '#/modules/auth/sessions/session.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
	sub: string;
	iat?: number;
	exp?: number;
	jti?: string;
	familyId?: string;
	typ?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		private readonly redisService: RedisService,
		private readonly sessionService: SessionService,
		configService: ConfigService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('auth.jwtSecret')!,
		});
	}

	async validate(payload: JwtPayload) {
		if (!payload.jti) {
			throw new UnauthorizedException('Token is missing unique identifier (jti)');
		}

		const isValid = await this.sessionService.validateSession(payload.jti);
		if (!isValid) {
			throw new UnauthorizedException('Session is invalid or has been revoked');
		}

		return payload;
	}
}
