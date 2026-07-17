import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { PasswordService } from '$lib/password/password.service';
import { JwtPayload, TokenService } from '$lib/auth-token/token.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function makePrisma() {
	return {
		userIdentity: {
			findUnique: jest.fn(),
			update: jest.fn(),
			create: jest.fn(),
		},
		user: {
			create: jest.fn(),
			findUnique: jest.fn(),
		},
		session: {
			create: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
	} as unknown as PrismaService & {
		userIdentity: {
			findUnique: jest.Mock;
			update: jest.Mock;
			create: jest.Mock;
		};
		user: { create: jest.Mock; findUnique: jest.Mock };
		session: {
			create: jest.Mock;
			findUnique: jest.Mock;
			update: jest.Mock;
			updateMany: jest.Mock;
		};
	};
}

function makeConfig(): ConfigService {
	return {
		jwt: {
			accessSecret: 'access-secret',
			refreshSecret: 'refresh-secret',
			accessExpiresIn: '15m',
			refreshExpiresIn: '30d',
		},
		auth: {
			lockoutMaxAttempts: 5,
			lockoutDurationMinutes: 15,
			cookieDomain: undefined,
			cookieSecure: false,
		},
	} as unknown as ConfigService;
}

describe('AuthService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let password: { hash: jest.Mock; verify: jest.Mock };
	let tokenService: {
		signAccessToken: jest.Mock;
		signRefreshToken: jest.Mock;
		verifyRefreshToken: jest.Mock;
	};
	let service: AuthService;

	beforeEach(() => {
		prisma = makePrisma();
		password = { hash: jest.fn(), verify: jest.fn() };
		tokenService = {
			signAccessToken: jest.fn(),
			signRefreshToken: jest.fn(),
			verifyRefreshToken: jest.fn(),
		};

		service = new AuthService(
			prisma,
			password as unknown as PasswordService,
			tokenService as unknown as TokenService,
			makeConfig(),
		);
	});

	describe('register', () => {
		it('throws 422 when neither email nor phone is provided', async () => {
			await expect(
				service.register({
					password: 'super-secret-1',
					displayName: 'Ada',
				} as never),
			).rejects.toMatchObject({ status: 422 });
		});

		it('throws ConflictException when the identifier is already registered', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({ id: 'existing' });

			await expect(
				service.register({
					email: 'ada@example.test',
					password: 'super-secret-1',
					displayName: 'Ada',
				}),
			).rejects.toBeInstanceOf(ConflictException);
		});

		it('hashes the password and creates a user with a local identity', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);
			password.hash.mockResolvedValue('hashed-password');
			prisma.user.create.mockResolvedValue({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});

			const result = await service.register({
				email: 'ada@example.test',
				password: 'super-secret-1',
				displayName: 'Ada',
			});

			expect(password.hash).toHaveBeenCalledWith('super-secret-1');
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					email: 'ada@example.test',
					phone: undefined,
					displayName: 'Ada',
					identities: {
						create: {
							providerCode: 'local',
							identifier: 'ada@example.test',
							secretHash: 'hashed-password',
						},
					},
				}),
			});
			expect(result).toEqual({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
			expect(result).not.toHaveProperty('secretHash');
		});
	});

	describe('validateOAuthLogin', () => {
		const profile = {
			providerAccountId: 'google-account-1',
			email: 'ada@example.test',
			emailVerified: true,
			displayName: 'Ada',
			accessToken: 'provider-access-token',
			refreshToken: 'provider-refresh-token',
		};

		it('updates tokens and returns the linked user when a matching identity already exists', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				user: {
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada',
					role: 'USER',
				},
			});

			const result = await service.validateOAuthLogin('google', profile);

			expect(prisma.userIdentity.findUnique).toHaveBeenCalledWith({
				where: {
					providerCode_providerAccountId: {
						providerCode: 'google',
						providerAccountId: 'google-account-1',
					},
				},
				include: { user: true },
			});
			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: {
					accessToken: 'provider-access-token',
					refreshToken: 'provider-refresh-token',
					lastUsedAt: expect.any(Date),
				},
			});
			expect(prisma.user.create).not.toHaveBeenCalled();
			expect(result).toEqual({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
		});

		it('auto-links a new identity to an existing user when the provider asserts the email is verified (AC-5)', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);
			prisma.user.findUnique.mockResolvedValue({
				id: 'existing-user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada (local)',
				role: 'USER',
			});

			const result = await service.validateOAuthLogin('google', profile);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: 'ada@example.test' },
			});
			expect(prisma.userIdentity.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					userId: 'existing-user-1',
					providerCode: 'google',
					providerAccountId: 'google-account-1',
					emailVerified: true,
				}),
			});
			expect(prisma.user.create).not.toHaveBeenCalled();
			expect(result).toEqual({
				id: 'existing-user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada (local)',
				role: 'USER',
			});
		});

		it('does not auto-link, and creates a new user instead, when the provider email is not verified even if a matching user exists', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);
			prisma.user.create.mockResolvedValue({
				id: 'new-user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});

			await service.validateOAuthLogin('google', {
				...profile,
				emailVerified: false,
			});

			expect(prisma.user.findUnique).not.toHaveBeenCalled();
			expect(prisma.userIdentity.create).not.toHaveBeenCalled();
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					email: 'ada@example.test',
					displayName: 'Ada',
					identities: {
						create: expect.objectContaining({
							providerCode: 'google',
							providerAccountId: 'google-account-1',
							emailVerified: false,
						}),
					},
				}),
			});
		});

		it('creates a brand new user and identity when there is no existing identity or matching verified user', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);
			prisma.user.findUnique.mockResolvedValue(null);
			prisma.user.create.mockResolvedValue({
				id: 'new-user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});

			const result = await service.validateOAuthLogin('google', profile);

			expect(prisma.user.create).toHaveBeenCalled();
			expect(result).toEqual({
				id: 'new-user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
		});
	});

	describe('validateLocalLogin', () => {
		it('throws UnauthorizedException when no identity matches', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue(null);

			await expect(
				service.validateLocalLogin('ada@example.test', 'anything'),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('throws UnauthorizedException when the identity has no password set (e.g. OAuth only)', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				secretHash: null,
				failedAttempts: 0,
				lockedUntil: null,
			});

			await expect(
				service.validateLocalLogin('ada@example.test', 'anything'),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('throws 423 Locked when lockedUntil is in the future, without checking the password', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				secretHash: 'hashed',
				failedAttempts: 5,
				lockedUntil: new Date(Date.now() + 60_000),
			});

			await expect(
				service.validateLocalLogin('ada@example.test', 'correct'),
			).rejects.toMatchObject({ status: 423 });
			expect(password.verify).not.toHaveBeenCalled();
		});

		it('increments failedAttempts without locking below the threshold', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				secretHash: 'hashed',
				failedAttempts: 2,
				lockedUntil: null,
			});
			password.verify.mockResolvedValue(false);

			await expect(
				service.validateLocalLogin('ada@example.test', 'wrong'),
			).rejects.toBeInstanceOf(UnauthorizedException);

			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: { failedAttempts: 3, lockedUntil: null },
			});
		});

		it('locks the identity once failedAttempts reaches the configured max', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				secretHash: 'hashed',
				failedAttempts: 4,
				lockedUntil: null,
			});
			password.verify.mockResolvedValue(false);

			await expect(
				service.validateLocalLogin('ada@example.test', 'wrong'),
			).rejects.toBeInstanceOf(UnauthorizedException);

			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: {
					failedAttempts: 5,
					lockedUntil: expect.any(Date),
				},
			});
		});

		it('resets failedAttempts and lockedUntil on a correct password', async () => {
			prisma.userIdentity.findUnique.mockResolvedValue({
				id: 'identity-1',
				secretHash: 'hashed',
				failedAttempts: 3,
				lockedUntil: null,
				user: {
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada',
					role: 'USER',
				},
			});
			password.verify.mockResolvedValue(true);

			const result = await service.validateLocalLogin(
				'ada@example.test',
				'correct',
			);

			expect(prisma.userIdentity.update).toHaveBeenCalledWith({
				where: { id: 'identity-1' },
				data: {
					failedAttempts: 0,
					lockedUntil: null,
					lastUsedAt: expect.any(Date),
				},
			});
			expect(result).toEqual({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
		});
	});

	describe('createSession', () => {
		it('creates a session row and signs tokens sharing the same session id', async () => {
			tokenService.signAccessToken.mockReturnValue('access-token');
			tokenService.signRefreshToken.mockReturnValue('refresh-token');
			prisma.session.create.mockResolvedValue({});

			const tokens = await service.createSession(
				{
					id: 'user-1',
					email: 'ada@example.test',
					phone: null,
					displayName: 'Ada',
					role: 'USER',
				},
				{ userAgent: 'jest', ip: '127.0.0.1' },
			);

			expect(tokens).toEqual({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});

			const accessPayload = tokenService.signAccessToken.mock
				.calls[0][0] as JwtPayload;
			const refreshPayload = tokenService.signRefreshToken.mock
				.calls[0][0] as JwtPayload;

			expect(accessPayload).toEqual(refreshPayload);
			expect(accessPayload.sub).toBe('user-1');
			expect(accessPayload.role).toBe('USER');
			expect(typeof accessPayload.sid).toBe('string');

			expect(prisma.session.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					id: accessPayload.sid,
					userId: 'user-1',
					refreshToken: 'refresh-token',
					userAgent: 'jest',
					ip: '127.0.0.1',
					expiresAt: expect.any(Date),
				}),
			});
		});
	});

	describe('rotateSession', () => {
		it('throws when the refresh token fails verification', async () => {
			tokenService.verifyRefreshToken.mockImplementation(() => {
				throw new Error('invalid signature');
			});

			await expect(service.rotateSession('garbage')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('throws when the session no longer exists', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});
			prisma.session.findUnique.mockResolvedValue(null);

			await expect(service.rotateSession('token')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('throws when the session is already revoked', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				revokedAt: new Date(),
				refreshToken: 'token',
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(service.rotateSession('token')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('revokes the session and throws when the refresh token was already rotated (replay)', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				revokedAt: null,
				refreshToken: 'the-current-token',
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(
				service.rotateSession('an-old-already-rotated-token'),
			).rejects.toBeInstanceOf(UnauthorizedException);

			expect(prisma.session.update).toHaveBeenCalledWith({
				where: { id: 'session-1' },
				data: { revokedAt: expect.any(Date) },
			});
		});

		it('throws without revoking when the session has expired', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				revokedAt: null,
				refreshToken: 'token',
				expiresAt: new Date(Date.now() - 1000),
			});

			await expect(service.rotateSession('token')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);

			expect(prisma.session.update).not.toHaveBeenCalled();
		});

		it('rotates the token and updates the session on success', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				revokedAt: null,
				refreshToken: 'the-current-token',
				expiresAt: new Date(Date.now() + 60_000),
			});
			tokenService.signAccessToken.mockReturnValue('new-access-token');
			tokenService.signRefreshToken.mockReturnValue('new-refresh-token');

			const tokens = await service.rotateSession('the-current-token');

			expect(tokens).toEqual({
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
			});
			expect(prisma.session.update).toHaveBeenCalledWith({
				where: { id: 'session-1' },
				data: {
					refreshToken: 'new-refresh-token',
					expiresAt: expect.any(Date),
				},
			});
		});
	});

	describe('revokeSessionByRefreshToken', () => {
		it('does nothing when the token fails verification (no throw)', async () => {
			tokenService.verifyRefreshToken.mockImplementation(() => {
				throw new Error('invalid');
			});

			await expect(
				service.revokeSessionByRefreshToken('garbage'),
			).resolves.toBeUndefined();
			expect(prisma.session.updateMany).not.toHaveBeenCalled();
		});

		it('revokes the matching, not-yet-revoked session', async () => {
			tokenService.verifyRefreshToken.mockReturnValue({
				sub: 'user-1',
				role: 'USER',
				sid: 'session-1',
			});

			await service.revokeSessionByRefreshToken('token');

			expect(prisma.session.updateMany).toHaveBeenCalledWith({
				where: { id: 'session-1', revokedAt: null },
				data: { revokedAt: expect.any(Date) },
			});
		});
	});
});
