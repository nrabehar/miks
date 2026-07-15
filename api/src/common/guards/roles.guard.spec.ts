import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function makeContext(user?: { role: string }): ExecutionContext {
	return {
		getHandler: () => ({}),
		getClass: () => ({}),
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
	} as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
	function makeGuard(requiredRoles: string[] | undefined) {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
		} as unknown as Reflector;

		return new RolesGuard(reflector);
	}

	it('allows the request through when no roles are required', () => {
		const guard = makeGuard(undefined);

		expect(guard.canActivate(makeContext({ role: 'USER' }))).toBe(true);
	});

	it('allows the request through when the required roles list is empty', () => {
		const guard = makeGuard([]);

		expect(guard.canActivate(makeContext({ role: 'USER' }))).toBe(true);
	});

	it('throws ForbiddenException when roles are required but there is no authenticated user', () => {
		const guard = makeGuard(['ADMIN']);

		expect(() => guard.canActivate(makeContext(undefined))).toThrow(
			ForbiddenException,
		);
	});

	it('throws ForbiddenException when the user role is not in the required list', () => {
		const guard = makeGuard(['ADMIN']);

		expect(() => guard.canActivate(makeContext({ role: 'USER' }))).toThrow(
			ForbiddenException,
		);
	});

	it('allows the request through when the user role matches one of the required roles', () => {
		const guard = makeGuard(['ADMIN', 'USER']);

		expect(guard.canActivate(makeContext({ role: 'USER' }))).toBe(true);
	});
});
