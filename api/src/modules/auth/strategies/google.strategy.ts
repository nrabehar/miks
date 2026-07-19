import { ConfigService } from '$lib/config/config.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		config: ConfigService,
		private readonly authService: AuthService,
	) {
		super({
			// passport-oauth2 throws in its constructor if clientID is falsy; a
			// placeholder keeps the app bootable when Google OAuth isn't configured.
			// GoogleAuthGuard checks the real config and blocks the route before this
			// strategy is ever invoked, so the placeholder is never actually used.
			clientID: config.oauth.google.clientId || 'not-configured',
			clientSecret: config.oauth.google.clientSecret || 'not-configured',
			callbackURL:
				config.oauth.google.redirectUri ||
				'http://localhost/not-configured',
			scope: ['profile', 'email'],
		});
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: VerifyCallback,
	): Promise<void> {
		try {
			const email = profile.emails?.[0]?.value ?? null;
			const identity = await this.authService.validateOAuthLogin(
				'google',
				{
					providerAccountId: profile.id,
					email,
					emailVerified: profile.emails?.[0]?.verified === true,
					displayName: profile.displayName,
					accessToken,
					refreshToken,
				},
			);

			done(null, identity);
		} catch (error) {
			done(error as Error, false);
		}
	}
}
