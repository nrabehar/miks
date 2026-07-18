import { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { TokenService } from '$lib/auth-token/token.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { RequestWithDeviceId } from './device-id.middleware';
import { DeviceService } from './device.service';
import { VerificationService } from './verification.service';

function makeConfig(): ConfigService {
	return {
		oauth: { webUrl: 'http://localhost:5173' },
	} as unknown as ConfigService;
}

function makeResponse(): Response {
	return { redirect: jest.fn() } as unknown as Response;
}

function makeRequest(
	overrides: Partial<RequestWithDeviceId> = {},
): RequestWithDeviceId {
	return {
		headers: {},
		cookies: {},
		deviceId: 'device-1',
		...overrides,
	} as unknown as RequestWithDeviceId;
}

describe('AuthController', () => {
	const user: AuthenticatedUser = {
		id: 'user-1',
		email: 'ada@example.test',
		phone: null,
		displayName: 'Ada',
		role: 'USER',
		emailVerified: true,
	};

	let authService: {
		register: jest.Mock;
		createSession: jest.Mock;
		rotateSession: jest.Mock;
		revokeSessionByRefreshToken: jest.Mock;
	};
	let tokenService: { setAuthCookies: jest.Mock; clearAuthCookies: jest.Mock };
	let prisma: {
		session: {
			findMany: jest.Mock;
			findUnique: jest.Mock;
			update: jest.Mock;
		};
	};
	let deviceService: {
		identifyForRegister: jest.Mock;
		identifyForLogin: jest.Mock;
		revokeByDeviceId: jest.Mock;
	};
	let controller: AuthController;

	beforeEach(() => {
		authService = {
			register: jest.fn(),
			createSession: jest.fn(),
			rotateSession: jest.fn(),
			revokeSessionByRefreshToken: jest.fn(),
		};
		tokenService = { setAuthCookies: jest.fn(), clearAuthCookies: jest.fn() };
		prisma = {
			session: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
				update: jest.fn(),
			},
		};
		deviceService = {
			identifyForRegister: jest.fn().mockResolvedValue({ id: 'device-1' }),
			identifyForLogin: jest.fn().mockResolvedValue({
				device: { id: 'device-1' },
				requiresConfirmation: false,
			}),
			revokeByDeviceId: jest.fn(),
		};

		controller = new AuthController(
			authService as unknown as AuthService,
			tokenService as unknown as TokenService,
			prisma as unknown as PrismaService,
			{} as unknown as VerificationService,
			deviceService as unknown as DeviceService,
			makeConfig(),
		);
	});

	describe('register', () => {
		it('registers, creates a session, sets cookies, and returns the user with tokens', async () => {
			authService.register.mockResolvedValue(user);
			authService.createSession.mockResolvedValue({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});

			const req = makeRequest({ headers: { 'user-agent': 'jest' } });
			const res = makeResponse();

			const result = await controller.register(
				{
					email: 'ada@example.test',
					password: 'super-secret-1',
					displayName: 'Ada',
				},
				req,
				res,
			);

			expect(authService.createSession).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ userAgent: 'jest' }),
			);
			expect(tokenService.setAuthCookies).toHaveBeenCalledWith(res, {
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});
			expect(result).toEqual({
				user,
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});
		});
	});

	describe('login', () => {
		it('creates a session for the already-authenticated user and sets cookies', async () => {
			authService.createSession.mockResolvedValue({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});

			const req = makeRequest();
			const res = makeResponse();

			const result = await controller.login(user, req, res);

			expect(authService.createSession).toHaveBeenCalledWith(
				user,
				expect.any(Object),
			);
			expect(tokenService.setAuthCookies).toHaveBeenCalled();
			expect(result).toEqual({
				user,
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			});
		});
	});

	describe('refresh', () => {
		it('throws when there is no refresh token in the body or cookies', async () => {
			const req = makeRequest({ cookies: {} });

			await expect(
				controller.refresh(req, makeResponse(), undefined),
			).rejects.toThrow('No refresh token provided');
		});

		it('uses the cookie refresh token when no body token is given', async () => {
			authService.rotateSession.mockResolvedValue({
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
			});
			const req = makeRequest({
				cookies: { refresh_token: 'cookie-refresh-token' },
			});

			const result = await controller.refresh(req, makeResponse(), undefined);

			expect(authService.rotateSession).toHaveBeenCalledWith(
				'cookie-refresh-token',
			);
			expect(result).toEqual({
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
			});
		});

		it('prefers a body refresh token over the cookie', async () => {
			authService.rotateSession.mockResolvedValue({
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
			});
			const req = makeRequest({
				cookies: { refresh_token: 'cookie-refresh-token' },
			});

			await controller.refresh(req, makeResponse(), 'body-refresh-token');

			expect(authService.rotateSession).toHaveBeenCalledWith(
				'body-refresh-token',
			);
		});
	});

	describe('logout', () => {
		it('revokes the session for the cookie refresh token and clears cookies', async () => {
			const req = makeRequest({ cookies: { refresh_token: 'a-token' } });
			const res = makeResponse();

			await controller.logout(req, res);

			expect(authService.revokeSessionByRefreshToken).toHaveBeenCalledWith(
				'a-token',
			);
			expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res);
		});

		it('still clears cookies when there is no refresh token cookie to revoke', async () => {
			const req = makeRequest({ cookies: {} });
			const res = makeResponse();

			await controller.logout(req, res);

			expect(authService.revokeSessionByRefreshToken).not.toHaveBeenCalled();
			expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res);
		});
	});

	describe('me', () => {
		it('returns the current authenticated user as-is', () => {
			expect(controller.me(user)).toBe(user);
		});
	});

	describe('sessions', () => {
		it('lists the sessions and marks the one matching the current cookie as current', async () => {
			prisma.session.findMany.mockResolvedValue([
				{
					id: 'session-1',
					ip: '127.0.0.1',
					userAgent: 'jest',
					createdAt: new Date('2026-01-01'),
					expiresAt: new Date('2026-02-01'),
					revokedAt: null,
					refreshToken: 'current-token',
				},
				{
					id: 'session-2',
					ip: '10.0.0.1',
					userAgent: 'other-device',
					createdAt: new Date('2026-01-02'),
					expiresAt: new Date('2026-02-02'),
					revokedAt: new Date('2026-01-05'),
					refreshToken: 'a-different-token',
				},
			]);
			const req = makeRequest({
				cookies: { refresh_token: 'current-token' },
			});

			const result = await controller.sessions(user, req);

			expect(prisma.session.findMany).toHaveBeenCalledWith({
				where: { userId: user.id },
				orderBy: { createdAt: 'desc' },
				include: { device: true },
			});
			expect(result).toEqual([
				expect.objectContaining({ id: 'session-1', current: true, revoked: false }),
				expect.objectContaining({ id: 'session-2', current: false, revoked: true }),
			]);
		});
	});

	describe('revokeSession', () => {
		it('throws NotFoundException when the session does not exist', async () => {
			prisma.session.findUnique.mockResolvedValue(null);

			await expect(
				controller.revokeSession(user, 'missing-session'),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('throws ForbiddenException when the session belongs to another user', async () => {
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				userId: 'someone-else',
			});

			await expect(
				controller.revokeSession(user, 'session-1'),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(prisma.session.update).not.toHaveBeenCalled();
		});

		it('revokes the session when it belongs to the caller', async () => {
			prisma.session.findUnique.mockResolvedValue({
				id: 'session-1',
				userId: user.id,
			});

			await controller.revokeSession(user, 'session-1');

			expect(prisma.session.update).toHaveBeenCalledWith({
				where: { id: 'session-1' },
				data: { revokedAt: expect.any(Date) },
			});
		});
	});

	describe('OAuth callbacks (google/facebook)', () => {
		// The route/redirect guards (GoogleAuthGuard etc.) that gate these handlers
		// and the passport strategy handshake are covered end to end by
		// /check verify's /auth/google, /auth/facebook checks; these
		// tests cover only the shared completeOAuthLogin behavior once a guard has
		// already resolved an AuthenticatedUser.
		it.each([
			['googleCallback' as const],
			['facebookCallback' as const],
		])(
			'%s creates a session, sets cookies, and redirects to the configured web app URL',
			async (method) => {
				authService.createSession.mockResolvedValue({
					accessToken: 'access-token',
					refreshToken: 'refresh-token',
				});
				const req = makeRequest({ headers: { 'user-agent': 'jest' } });
				const res = makeResponse();

				await controller[method](user, req, res);

				expect(authService.createSession).toHaveBeenCalledWith(
					user,
					expect.objectContaining({ userAgent: 'jest' }),
				);
				expect(tokenService.setAuthCookies).toHaveBeenCalledWith(res, {
					accessToken: 'access-token',
					refreshToken: 'refresh-token',
				});
				expect(res.redirect).toHaveBeenCalledWith(
					'http://localhost:5173/auth/oauth-callback',
				);
			},
		);
	});
});
