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
	whatsapp: {
		apiKey: string;
		apiUrl: string;
	};
	auth: {
		lockoutMaxAttempts: number;
		lockoutDurationMinutes: number;
		verificationTokenExpiryMinutes: number;
		cookieDomain: string | undefined;
		cookieSecure: boolean;
	};
	oauth: {
		webUrl: string;
		google: {
			clientId: string;
			clientSecret: string;
			redirectUri: string;
		};
		facebook: {
			clientId: string;
			clientSecret: string;
			redirectUri: string;
		};
		apple: {
			clientId: string;
			teamId: string;
			keyId: string;
			privateKey: string;
			redirectUri: string;
		};
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
	whatsapp: {
		apiKey: process.env.WHATSAPP_API_KEY ?? '',
		apiUrl: process.env.WHATSAPP_API_URL ?? '',
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
		verificationTokenExpiryMinutes: parseInt(
			process.env.AUTH_VERIFICATION_TOKEN_EXPIRY_MINUTES ?? '15',
			10,
		),
		cookieDomain: process.env.COOKIE_DOMAIN,
		cookieSecure: process.env.COOKIE_SECURE === 'true',
	},
	oauth: {
		webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
			redirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
		},
		facebook: {
			clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
			clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
			redirectUri: process.env.FACEBOOK_REDIRECT_URI ?? '',
		},
		apple: {
			clientId: process.env.APPLE_CLIENT_ID ?? '',
			teamId: process.env.APPLE_TEAM_ID ?? '',
			keyId: process.env.APPLE_KEY_ID ?? '',
			privateKey: process.env.APPLE_PRIVATE_KEY ?? '',
			redirectUri: process.env.APPLE_REDIRECT_URI ?? '',
		},
	},
});
