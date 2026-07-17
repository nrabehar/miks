import { ConfigService } from '$lib/config/config.service';
import { InternalServerErrorException } from '@nestjs/common';
import { AppleAuthGuard } from './apple-auth.guard';

function makeConfig(overrides: {
	clientId?: string;
	teamId?: string;
	keyId?: string;
	privateKey?: string;
}) {
	return {
		oauth: {
			apple: {
				clientId: overrides.clientId ?? '',
				teamId: overrides.teamId ?? '',
				keyId: overrides.keyId ?? '',
				privateKey: overrides.privateKey ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('AppleAuthGuard', () => {
	// canActivate's delegation to the real passport 'apple' strategy is
	// covered end to end by /check verify's GET /auth/apple check.
	it('throws InternalServerErrorException without delegating to passport when Apple Sign In is not configured', () => {
		const guard = new AppleAuthGuard(makeConfig({}));

		expect(() => guard.canActivate({} as never)).toThrow(
			new InternalServerErrorException('Apple Sign In is not configured'),
		);
	});

	it.each([
		['clientId' as const],
		['teamId' as const],
		['keyId' as const],
		['privateKey' as const],
	])('throws when only %s is missing', (missingField) => {
		const complete = {
			clientId: 'a-client-id',
			teamId: 'a-team-id',
			keyId: 'a-key-id',
			privateKey: 'a-private-key',
		};
		const guard = new AppleAuthGuard(
			makeConfig({ ...complete, [missingField]: '' }),
		);

		expect(() => guard.canActivate({} as never)).toThrow(
			InternalServerErrorException,
		);
	});
});
