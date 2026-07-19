import { ConfigService } from '$lib/config/config.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyFunction } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
	constructor(
		config: ConfigService,
		private readonly authService: AuthService,
	) {
		super({
			// passport-oauth2 throws in its constructor if clientID is falsy; a
			// placeholder keeps the app bootable when Facebook OAuth isn't configured.
			// FacebookAuthGuard checks the real config and blocks the route before this
			// strategy is ever invoked, so the placeholder is never actually used.
			clientID: config.oauth.facebook.clientId || 'not-configured',
			clientSecret:
				config.oauth.facebook.clientSecret || 'not-configured',
			callbackURL:
				config.oauth.facebook.redirectUri ||
				'http://localhost/not-configured',
			profileFields: ['id', 'displayName', 'emails'],
			scope: ['email'],
		});
	}

	validate: VerifyFunction = async (
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: (error: Error | null, user?: false | Express.User) => void,
	) => {
		try {
			const email = profile.emails?.[0]?.value ?? null;
			const identity = await this.authService.validateOAuthLogin(
				'facebook',
				{
					providerAccountId: profile.id,
					email,
					// Facebook only returns emails it has already verified via its own login flow.
					emailVerified: email !== null,
					displayName: profile.displayName,
					accessToken,
					refreshToken,
				},
			);

			done(null, identity);
		} catch (error) {
			done(error as Error);
		}
	};
}
