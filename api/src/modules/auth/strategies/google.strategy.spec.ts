import { ConfigService } from '$lib/config/config.service';
import { AuthService } from '../auth.service';
import { GoogleStrategy } from './google.strategy';

function makeConfig(
	overrides: Partial<{
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}> = {},
): ConfigService {
	return {
		oauth: {
			google: {
				clientId: overrides.clientId ?? '',
				clientSecret: overrides.clientSecret ?? '',
				redirectUri: overrides.redirectUri ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('GoogleStrategy', () => {
	// Regression test for the bug /debug found and fixed: passport-oauth2
	// throws in its own constructor when clientID is falsy, and since Nest
	// eagerly instantiates every strategy provider at bootstrap, an unset
	// GOOGLE_CLIENT_ID used to crash the entire app, not just this route.
	it('does not throw when Google OAuth is entirely unconfigured', () => {
		expect(
			() => new GoogleStrategy(makeConfig(), {} as AuthService),
		).not.toThrow();
	});

	describe('validate', () => {
		it('maps the Google profile and resolves with the identity on success', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada',
					role: 'USER',
				}),
			};
			const strategy = new GoogleStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{
					id: 'google-account-1',
					displayName: 'Ada',
					emails: [{ value: 'ada@example.test', verified: true }],
				} as never,
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith('google', {
				providerAccountId: 'google-account-1',
				email: 'ada@example.test',
				emailVerified: true,
				displayName: 'Ada',
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});
			expect(done).toHaveBeenCalledWith(null, {
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
		});

		it('treats a missing email as unverified and null, rather than throwing', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({}),
			};
			const strategy = new GoogleStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{ id: 'google-account-1', displayName: 'Ada', emails: [] } as never,
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
				'google',
				expect.objectContaining({ email: null, emailVerified: false }),
			);
		});

		it('calls done with the error, not a rejection, when validateOAuthLogin fails', async () => {
			const failure = new Error('database is down');
			const authService = {
				validateOAuthLogin: jest.fn().mockRejectedValue(failure),
			};
			const strategy = new GoogleStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{
					id: 'google-account-1',
					displayName: 'Ada',
					emails: [{ value: 'ada@example.test', verified: true }],
				} as never,
				done,
			);

			expect(done).toHaveBeenCalledWith(failure, false);
		});
	});
});
