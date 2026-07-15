export interface AppConfig {
	app: {
		env: string;
		port: number;
		url: string;
	};
	db: {
		url: string;
	};
	jwt: {
		accessSecret: string;
		refreshSecret: string;
		accessExpiresIn: string;
		refreshExpiresIn: string;
	};
	mail: {
		resendApiKey: string;
		domain: string;
	};
	auth: {
		lockoutMaxAttempts: number;
		lockoutDurationMinutes: number;
		cookieDomain: string | undefined;
		cookieSecure: boolean;
	};
}

export default (): AppConfig => ({
	app: {
		env: process.env.NODE_ENV ?? 'development',
		port: parseInt(process.env.PORT ?? '3000', 10),
		url: process.env.APP_URL ?? 'http://localhost:3000',
	},
	db: {
		url: process.env.DATABASE_URL ?? '',
	},
	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
		refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
		accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
	},
	mail: {
		resendApiKey: process.env.RESEND_API_KEY ?? '',
		domain: process.env.RESEND_DOMAIN ?? '',
	},
	auth: {
		lockoutMaxAttempts: parseInt(
			process.env.AUTH_LOCKOUT_MAX_ATTEMPTS ?? '5',
			10,
		),
		lockoutDurationMinutes: parseInt(
			process.env.AUTH_LOCKOUT_DURATION_MINUTES ?? '15',
			10,
		),
		cookieDomain: process.env.COOKIE_DOMAIN,
		cookieSecure: process.env.COOKIE_SECURE === 'true',
	},
});
