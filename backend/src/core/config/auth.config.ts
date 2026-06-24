import { registerAs } from '@nestjs/config';
import { Logger as NestLogger } from '@nestjs/common';

const isProd = process.env.NODE_ENV === 'production';
const logger = new NestLogger('AuthConfig');

function requireSecret(name: string, fallback: string): string {
	const value = process.env[name];
	if (!value) {
		if (isProd) {
			throw new Error(
				`[AuthConfig] ${name} is required in production. Refusing to start.`,
			);
		}
		logger.warn(
			`[AuthConfig] ${name} not set — falling back to insecure default (dev only).`,
		);
		return fallback;
	}
	if (isProd && value.length < 32) {
		throw new Error(
			`[AuthConfig] ${name} must be at least 32 chars in production (got ${value.length}).`,
		);
	}
	return value;
}

export interface AuthConfig {
	jwtSecret: string;
	jwtExpiresIn: string;
	jwtRefreshSecret: string;
	jwtRefreshExpiresIn: string;
	jwtResetSecret: string;
	cookieSecret: string;
	cookieMaxAge: number;
	googleClientId: string;
	googleClientSecret: string;
	googleRedirectUri: string;
}

export default registerAs('auth', async (): Promise<AuthConfig> => ({
	jwtSecret: requireSecret('JWT_SECRET', 'default_jwt_secret'),
	jwtExpiresIn: '15m',
	jwtRefreshSecret: requireSecret(
		'JWT_REFRESH_SECRET',
		'default_jwt_refresh_secret',
	),
	jwtRefreshExpiresIn: '7d',
	jwtResetSecret: requireSecret(
		'JWT_RESET_SECRET',
		'default_jwt_reset_secret',
	),
	cookieSecret: requireSecret('COOKIE_SECRET', 'default_cookie_secret'),
	cookieMaxAge: 604800000, // 7 days
	googleClientId: process.env.GOOGLE_CLIENT_ID!,
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	googleRedirectUri: process.env.GOOGLE_REDIRECT_URI!,
}));
