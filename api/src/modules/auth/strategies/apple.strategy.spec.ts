import { ConfigService } from '$lib/config/config.service';
import { AuthService } from '../auth.service';
import { AppleStrategy } from './apple.strategy';

function makeConfig(
	overrides: Partial<{
		clientId: string;
		teamId: string;
		keyId: string;
		privateKey: string;
		redirectUri: string;
	}> = {},
): ConfigService {
	return {
		oauth: {
			apple: {
				clientId: overrides.clientId ?? '',
				teamId: overrides.teamId ?? '',
				keyId: overrides.keyId ?? '',
				privateKey: overrides.privateKey ?? '',
				redirectUri: overrides.redirectUri ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('AppleStrategy', () => {
	// Regression test for the /debug boot-crash fix: @nicokaiser/passport-apple
	// throws in its constructor when clientID/teamID/keyID are falsy, which used
	// to crash the whole Nest app at bootstrap when Apple env vars were unset.
	it('does not throw when Apple Sign In is entirely unconfigured', () => {
		expect(
			() => new AppleStrategy(makeConfig(), {} as AuthService),
		).not.toThrow();
	});

	describe('validate', () => {
		const configured = {
			clientId: 'id',
			teamId: 'team',
			keyId: 'key',
			privateKey: 'a-private-key',
		};

		it('maps the Apple profile, joins first/last name, and resolves with the identity on success', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada Lovelace',
					role: 'USER',
				}),
			};
			const strategy = new AppleStrategy(
				makeConfig(configured),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{
					id: 'apple-account-1',
					email: 'ada@example.test',
					emailVerified: true,
					name: { firstName: 'Ada', lastName: 'Lovelace' },
				},
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith('apple', {
				providerAccountId: 'apple-account-1',
				email: 'ada@example.test',
				emailVerified: true,
				displayName: 'Ada Lovelace',
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});
			expect(done).toHaveBeenCalledWith(null, {
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada Lovelace',
				role: 'USER',
			});
		});

		it('falls back to the email as displayName when Apple sends no name (returned only on first authorization)', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({}),
			};
			const strategy = new AppleStrategy(
				makeConfig(configured),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{ id: 'apple-account-1', email: 'ada@example.test' },
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
				'apple',
				expect.objectContaining({ displayName: 'ada@example.test' }),
			);
		});

		it('falls back to a generic label when there is neither a name nor an email', async () => {
			const authService = {
				validateOAuthLogin: jest.fn().mockResolvedValue({}),
			};
			const strategy = new AppleStrategy(
				makeConfig(configured),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{ id: 'apple-account-1' },
				done,
			);

			expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
				'apple',
				expect.objectContaining({ displayName: 'Apple user', email: null }),
			);
		});

		it('calls done with the error when validateOAuthLogin fails', async () => {
			const failure = new Error('database is down');
			const authService = {
				validateOAuthLogin: jest.fn().mockRejectedValue(failure),
			};
			const strategy = new AppleStrategy(
				makeConfig(configured),
				authService as unknown as AuthService,
			);
			const done = jest.fn();

			await strategy.validate(
				'access-token',
				'refresh-token',
				{ id: 'apple-account-1', email: 'ada@example.test' },
				done,
			);

			expect(done).toHaveBeenCalledWith(failure);
		});
	});
});
