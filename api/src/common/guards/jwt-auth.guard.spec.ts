import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthenticatedUser, JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
	return {
		getHandler: () => ({}),
		getClass: () => ({}),
	} as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
	describe('canActivate', () => {
		it('allows the request through without delegating to passport when the route is @Public()', () => {
			const reflector = {
				getAllAndOverride: jest.fn().mockReturnValue(true),
			} as unknown as Reflector;
			const guard = new JwtAuthGuard(reflector);

			expect(guard.canActivate(makeContext())).toBe(true);
		});

		// Non-public routes delegate to the underlying passport-jwt strategy
		// (AuthGuard('jwt')'s own canActivate), which needs a registered
		// strategy and a real HTTP context to exercise; covered end to end
		// by /check verify's `/auth/me` checks instead of here.
	});

	describe('handleRequest', () => {
		const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

		it('rethrows the error passport produced, if any', () => {
			const guard = new JwtAuthGuard(reflector);
			const error = new Error('strategy blew up');

			expect(() => guard.handleRequest(error, undefined, undefined)).toThrow(
				error,
			);
		});

		it('throws UnauthorizedException with the info message when there is no user and no error', () => {
			const guard = new JwtAuthGuard(reflector);

			expect(() =>
				guard.handleRequest(null, undefined, { message: 'jwt expired' }),
			).toThrow(new UnauthorizedException('jwt expired'));
		});

		it('throws a default UnauthorizedException when there is no user, no error, and no info message', () => {
			const guard = new JwtAuthGuard(reflector);

			expect(() => guard.handleRequest(null, undefined, undefined)).toThrow(
				new UnauthorizedException('Not authenticated'),
			);
		});

		it('returns the user when authentication succeeded', () => {
			const guard = new JwtAuthGuard(reflector);
			const user: AuthenticatedUser = {
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
				emailVerified: true,
			};

			expect(guard.handleRequest(null, user, undefined)).toBe(user);
		});
	});
});
