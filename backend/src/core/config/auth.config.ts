import { registerAs } from '@nestjs/config';

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

export default registerAs('auth', async (): Promise<AuthConfig> => {
	return {
		jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
		jwtExpiresIn: '15m',
		jwtRefreshSecret:
			process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret',
		jwtRefreshExpiresIn: '7d',
		jwtResetSecret:
			process.env.JWT_RESET_SECRET || 'default_jwt_reset_secret',
		cookieSecret: process.env.COOKIE_SECRET || 'default_cookie_secret',
		cookieMaxAge: 604800000, // 7 days
		googleClientId: process.env.GOOGLE_CLIENT_ID!,
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		googleRedirectUri: process.env.GOOGLE_REDIRECT_URI!,
	};
});
