import { ConfigService } from '$lib/config/config.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@nicokaiser/passport-apple';
import { AuthService } from '../auth.service';

interface AppleProfile {
	id: string;
	email?: string;
	emailVerified?: boolean;
	name?: { firstName?: string; lastName?: string };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
	constructor(
		config: ConfigService,
		private readonly authService: AuthService,
	) {
		super({
			// @nicokaiser/passport-apple throws in its constructor if clientID/teamID/
			// keyID are falsy; placeholders keep the app bootable when Apple Sign In
			// isn't configured. AppleAuthGuard checks the real config and blocks the
			// route before this strategy is ever invoked, so these are never used.
			clientID: config.oauth.apple.clientId || 'not-configured',
			teamID: config.oauth.apple.teamId || 'not-configured',
			keyID: config.oauth.apple.keyId || 'not-configured',
			// Apple's env value stores literal "\n" sequences; restore real newlines for the PEM key.
			key: Buffer.from(config.oauth.apple.privateKey.replace(/\\n/g, '\n')),
			callbackURL: config.oauth.apple.redirectUri || 'http://localhost/not-configured',
			scope: ['name', 'email'],
		});
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: AppleProfile,
		done: (error: Error | null, user?: false | Express.User) => void,
	): Promise<void> {
		try {
			const displayName = profile.name
				? `${profile.name.firstName ?? ''} ${profile.name.lastName ?? ''}`.trim()
				: '';

			const identity = await this.authService.validateOAuthLogin('apple', {
				providerAccountId: profile.id,
				email: profile.email ?? null,
				emailVerified: profile.emailVerified === true,
				displayName: displayName || (profile.email ?? 'Apple user'),
				accessToken,
				refreshToken,
			});

			done(null, identity);
		} catch (error) {
			done(error as Error);
		}
	}
}
