import { ConfigService } from '$lib/config/config.service';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { JwtPayload, TokenService } from './token.service';

function makeConfig(overrides: Partial<{
	accessSecret: string;
	refreshSecret: string;
	accessExpiresIn: string;
	refreshExpiresIn: string;
	cookieSecure: boolean;
	cookieDomain: string | undefined;
}> = {}): ConfigService {
	const values = {
		accessSecret: 'access-secret',
		refreshSecret: 'refresh-secret',
		accessExpiresIn: '15m',
		refreshExpiresIn: '30d',
		cookieSecure: false,
		cookieDomain: undefined,
		...overrides,
	};

	return {
		jwt: {
			accessSecret: values.accessSecret,
			refreshSecret: values.refreshSecret,
			accessExpiresIn: values.accessExpiresIn,
			refreshExpiresIn: values.refreshExpiresIn,
		},
		auth: {
			cookieSecure: values.cookieSecure,
			cookieDomain: values.cookieDomain,
			lockoutMaxAttempts: 5,
			lockoutDurationMinutes: 15,
		},
	} as unknown as ConfigService;
}

describe('TokenService', () => {
	const payload: JwtPayload = { sub: 'user-1', role: 'USER', sid: 'session-1' };
	let service: TokenService;

	beforeEach(() => {
		service = new TokenService(new JwtService(), makeConfig());
	});

	describe('access token sign/verify', () => {
		it('signs an access token that verifies back to the same payload', () => {
			const token = service.signAccessToken(payload);
			const decoded = service.verifyAccessToken(token);

			expect(decoded).toMatchObject(payload);
		});

		it('throws when verifying a garbage access token', () => {
			expect(() => service.verifyAccessToken('not-a-jwt')).toThrow();
		});

		it('throws when an access token is verified with the wrong secret', () => {
			const wrongSecretService = new TokenService(
				new JwtService(),
				makeConfig({ accessSecret: 'a-different-secret' }),
			);
			const token = service.signAccessToken(payload);

			expect(() => wrongSecretService.verifyAccessToken(token)).toThrow();
		});
	});

	describe('refresh token sign/verify', () => {
		it('signs a refresh token that verifies back to the same payload', () => {
			const token = service.signRefreshToken(payload);
			const decoded = service.verifyRefreshToken(token);

			expect(decoded).toMatchObject(payload);
		});

		it('does not accept an access token as a refresh token (different secrets)', () => {
			const accessToken = service.signAccessToken(payload);

			expect(() => service.verifyRefreshToken(accessToken)).toThrow();
		});

		it('does not accept a refresh token as an access token (different secrets)', () => {
			const refreshToken = service.signRefreshToken(payload);

			expect(() => service.verifyAccessToken(refreshToken)).toThrow();
		});
	});

	describe('cookies', () => {
		function mockResponse(): Response {
			return {
				cookie: jest.fn(),
				clearCookie: jest.fn(),
			} as unknown as Response;
		}

		it('sets both the access and refresh cookies as httpOnly', () => {
			const res = mockResponse();

			service.setAuthCookies(res, {
				accessToken: 'access-token-value',
				refreshToken: 'refresh-token-value',
			});

			expect(res.cookie).toHaveBeenCalledWith(
				'access_token',
				'access-token-value',
				expect.objectContaining({ httpOnly: true }),
			);
			expect(res.cookie).toHaveBeenCalledWith(
				'refresh_token',
				'refresh-token-value',
				expect.objectContaining({ httpOnly: true }),
			);
		});

		it('marks cookies as secure when configured to', () => {
			const secureService = new TokenService(
				new JwtService(),
				makeConfig({ cookieSecure: true }),
			);
			const res = mockResponse();

			secureService.setAuthCookies(res, {
				accessToken: 'a',
				refreshToken: 'r',
			});

			expect(res.cookie).toHaveBeenCalledWith(
				'access_token',
				'a',
				expect.objectContaining({ secure: true }),
			);
		});

		it('clears both cookies on clearAuthCookies', () => {
			const res = mockResponse();

			service.clearAuthCookies(res);

			expect(res.clearCookie).toHaveBeenCalledWith(
				'access_token',
				expect.any(Object),
			);
			expect(res.clearCookie).toHaveBeenCalledWith(
				'refresh_token',
				expect.any(Object),
			);
		});
	});

	it('exposes the cookie names as static constants', () => {
		expect(TokenService.ACCESS_COOKIE).toBe('access_token');
		expect(TokenService.REFRESH_COOKIE).toBe('refresh_token');
	});
});
