import configuration from './configuration';

describe('configuration (oauth block)', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.WEB_URL;
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.GOOGLE_CLIENT_SECRET;
		delete process.env.GOOGLE_REDIRECT_URI;
		delete process.env.FACEBOOK_CLIENT_ID;
		delete process.env.FACEBOOK_CLIENT_SECRET;
		delete process.env.FACEBOOK_REDIRECT_URI;
		delete process.env.APPLE_CLIENT_ID;
		delete process.env.APPLE_TEAM_ID;
		delete process.env.APPLE_KEY_ID;
		delete process.env.APPLE_PRIVATE_KEY;
		delete process.env.APPLE_REDIRECT_URI;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('defaults every OAuth credential to an empty string and webUrl to the local dev URL when unset', () => {
		const config = configuration();

		expect(config.oauth).toEqual({
			webUrl: 'http://localhost:5173',
			google: { clientId: '', clientSecret: '', redirectUri: '' },
			facebook: { clientId: '', clientSecret: '', redirectUri: '' },
			apple: {
				clientId: '',
				teamId: '',
				keyId: '',
				privateKey: '',
				redirectUri: '',
			},
		});
	});

	it('reads every OAuth provider field from its environment variable when set', () => {
		process.env.WEB_URL = 'https://app.miks.mg';
		process.env.GOOGLE_CLIENT_ID = 'google-id';
		process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
		process.env.GOOGLE_REDIRECT_URI = 'https://api.miks.mg/auth/google/callback';
		process.env.FACEBOOK_CLIENT_ID = 'facebook-id';
		process.env.FACEBOOK_CLIENT_SECRET = 'facebook-secret';
		process.env.FACEBOOK_REDIRECT_URI =
			'https://api.miks.mg/auth/facebook/callback';
		process.env.APPLE_CLIENT_ID = 'apple-id';
		process.env.APPLE_TEAM_ID = 'apple-team';
		process.env.APPLE_KEY_ID = 'apple-key';
		process.env.APPLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----';
		process.env.APPLE_REDIRECT_URI = 'https://api.miks.mg/auth/apple/callback';

		const config = configuration();

		expect(config.oauth).toEqual({
			webUrl: 'https://app.miks.mg',
			google: {
				clientId: 'google-id',
				clientSecret: 'google-secret',
				redirectUri: 'https://api.miks.mg/auth/google/callback',
			},
			facebook: {
				clientId: 'facebook-id',
				clientSecret: 'facebook-secret',
				redirectUri: 'https://api.miks.mg/auth/facebook/callback',
			},
			apple: {
				clientId: 'apple-id',
				teamId: 'apple-team',
				keyId: 'apple-key',
				privateKey: '-----BEGIN PRIVATE KEY-----',
				redirectUri: 'https://api.miks.mg/auth/apple/callback',
			},
		});
	});
});
