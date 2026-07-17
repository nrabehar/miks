import { ConfigService } from '$lib/config/config.service';
import { AuthService } from '../auth.service';
import { FacebookStrategy } from './facebook.strategy';

function makeConfig(
	overrides: Partial<{
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}> = {},
): ConfigService {
	return {
		oauth: {
			facebook: {
				clientId: overrides.clientId ?? '',
				clientSecret: overrides.clientSecret ?? '',
				redirectUri: overrides.redirectUri ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('FacebookStrategy', () => {
	// Regression test for the /debug boot-crash fix: passport-oauth2 throws
	// in its constructor when clientID is falsy, which used to crash the
	// whole Nest app at bootstrap when FACEBOOK_APP_ID was unset.
	it('does not throw when Facebook OAuth is entirely unconfigured', () => {
		expect(
			() => new FacebookStrategy(makeConfig(), {} as AuthService),
		).not.toThrow();
	});

	describe('validate', () => {
		it('maps the Facebook profile and resolves with the identity on success', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada',
					role: 'USER',
				}),
			};
			const strategy = new FacebookStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{
					id: 'facebook-account-1',
					displayName: 'Ada',
					emails: [{ value: 'ada@example.test' }],
				} as never,
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
				'facebook',
				{
					providerAccountId: 'facebook-account-1',
					email: 'ada@example.test',
					// Facebook only ever returns an email it has already verified.
					emailVerified: true,
					displayName: 'Ada',
					accessToken: 'access-token',
					refreshToken: 'refresh-token',
				},
			);
			expect(done).toHaveBeenCalledWith(null, {
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
		});

		it('treats a missing email as unverified and null', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({}),
			};
			const strategy = new FacebookStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{ id: 'facebook-account-1', displayName: 'Ada', emails: [] } as never,
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
				'facebook',
				expect.objectContaining({ email: null, emailVerified: false }),
			);
		});

		it('calls done with the error when validateOAuthLogin fails', async () => {
			const failure = new Error('database is down');
			const authService = {
				validateOAuthLogin: jest.fn().mockRejectedValue(failure),
			};
			const strategy = new FacebookStrategy(
				makeConfig({ clientId: 'id', clientSecret: 'secret' }),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{
					id: 'facebook-account-1',
					displayName: 'Ada',
					emails: [{ value: 'ada@example.test' }],
				} as never,
				done,
			);

			expect(done).toHaveBeenCalledWith(failure);
		});
	});
});
