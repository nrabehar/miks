import { ConfigService } from '$lib/config/config.service';
import { InternalServerErrorException } from '@nestjs/common';
import { FacebookAuthGuard } from './facebook-auth.guard';

function makeConfig(overrides: { clientId?: string; clientSecret?: string }) {
	return {
		oauth: {
			facebook: {
				clientId: overrides.clientId ?? '',
				clientSecret: overrides.clientSecret ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('FacebookAuthGuard', () => {
	// canActivate's delegation to the real passport 'facebook' strategy is
	// covered end to end by /check verify's GET /auth/facebook check.
	it('throws InternalServerErrorException without delegating to passport when Facebook OAuth is not configured', () => {
		const guard = new FacebookAuthGuard(makeConfig({}));

		expect(() => guard.canActivate({} as never)).toThrow(
			new InternalServerErrorException('Facebook OAuth is not configured'),
		);
	});

	it('throws when only the client secret is missing', () => {
		const guard = new FacebookAuthGuard(
			makeConfig({ clientId: 'a-client-id' }),
		);

		expect(() => guard.canActivate({} as never)).toThrow(
			InternalServerErrorException,
		);
	});
});
