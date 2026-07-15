import { ConfigService } from '$lib/config/config.service';
import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import type { Response } from 'express';

export interface JwtPayload {
	sub: string;
	role: string;
	sid: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly config: ConfigService,
	) {}

	signAccessToken(payload: JwtPayload): string {
		return this.jwtService.sign(payload, {
			secret: this.config.jwt.accessSecret,
			expiresIn: this.config.jwt.accessExpiresIn,
		} as JwtSignOptions);
	}

	signRefreshToken(payload: JwtPayload): string {
		return this.jwtService.sign(payload, {
			secret: this.config.jwt.refreshSecret,
			expiresIn: this.config.jwt.refreshExpiresIn,
		} as JwtSignOptions);
	}

	verifyAccessToken(token: string): JwtPayload {
		return this.jwtService.verify<JwtPayload>(token, {
			secret: this.config.jwt.accessSecret,
		});
	}

	verifyRefreshToken(token: string): JwtPayload {
		return this.jwtService.verify<JwtPayload>(token, {
			secret: this.config.jwt.refreshSecret,
		});
	}

	setAuthCookies(res: Response, tokens: TokenPair): void {
		const cookieOptions = {
			httpOnly: true,
			secure: this.config.auth.cookieSecure,
			domain: this.config.auth.cookieDomain,
			sameSite: 'lax' as const,
		};

		res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions);
		res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
	}

	clearAuthCookies(res: Response): void {
		const cookieOptions = {
			httpOnly: true,
			secure: this.config.auth.cookieSecure,
			domain: this.config.auth.cookieDomain,
			sameSite: 'lax' as const,
		};

		res.clearCookie(ACCESS_COOKIE, cookieOptions);
		res.clearCookie(REFRESH_COOKIE, cookieOptions);
	}

	static readonly ACCESS_COOKIE = ACCESS_COOKIE;
	static readonly REFRESH_COOKIE = REFRESH_COOKIE;
}
