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
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
	},
	mail: {
		resendApiKey: process.env.RESEND_API_KEY ?? '',
		domain: process.env.RESEND_DOMAIN ?? '',
	},
});
