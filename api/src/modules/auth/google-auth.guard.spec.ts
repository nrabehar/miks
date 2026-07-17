import { ConfigService } from '$lib/config/config.service';
import { InternalServerErrorException } from '@nestjs/common';
import { GoogleAuthGuard } from './google-auth.guard';

function makeConfig(overrides: { clientId?: string; clientSecret?: string }) {
	return {
		oauth: {
			google: {
				clientId: overrides.clientId ?? '',
				clientSecret: overrides.clientSecret ?? '',
			},
		},
	} as unknown as ConfigService;
}

describe('GoogleAuthGuard', () => {
	// canActivate's delegation to the real passport 'google' strategy (via
	// AuthGuard('google')'s own canActivate) needs a full HTTP context and a
	// registered strategy; covered end to end by /check verify's
	// GET /auth/google check instead of here.
	it('throws InternalServerErrorException without delegating to passport when Google OAuth is not configured', () => {
		const guard = new GoogleAuthGuard(makeConfig({}));

		expect(() => guard.canActivate({} as never)).toThrow(
			new InternalServerErrorException('Google OAuth is not configured'),
		);
	});

	it('throws when only the client secret is missing', () => {
		const guard = new GoogleAuthGuard(
			makeConfig({ clientId: 'a-client-id' }),
		);

		expect(() => guard.canActivate({} as never)).toThrow(
			InternalServerErrorException,
		);
	});
});
