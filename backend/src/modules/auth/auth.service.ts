import { getErrorMessage } from '#/core/utils';
import { User } from '#/generated/prisma';
import { JwtPayload } from '#/modules/auth/strategies/jwt.strategy';
import { MailService } from '#/modules/email/mail.service';
import { TokenService } from '$/tokens/token.service';
import { AccountsService } from '$/users/accounts/accounts.service';
import { UsersService } from '$/users/users.service';
import {
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';
import { VerificationContext } from '../email/types/verification.type';
import type { UserLoginResult, UserRefreshResult } from './auth.type';
import { SessionService } from './sessions/session.service';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly usersService: UsersService,
		private readonly accountsService: AccountsService,
		private readonly tokenService: TokenService,
		private readonly sessionService: SessionService,
		private readonly mailService: MailService,
	) {}

	async register(
		email: string,
		username: string,
		password: string,
		lang: string = 'fr',
	): Promise<void> {
		if (!email || !username || !password) {
			throw new UnauthorizedException({
				email: 'Email, username and password are required',
			});
		}

		try {
			const user = await this.usersService.create(email, username);
			await this.accountsService.createCredentials(user.id, password);
			await this.sendWelcomeEmail(user);
			const token = await this.tokenService.createToken(user.id, 15);
			await this.mailService.sendVerificationCode({
				to: user.email,
				name: user.username!,
				code: token,
				context: VerificationContext.EMAIL_CONFIRMATION,
				lang,
				expirationTime: '15 min',
			});
			// TODO: Generate and store a default avatar in background — never throws.
			this.logger.log(`User registered successfully: ${username}`);
		} catch (error) {
			const message = getErrorMessage(error);
			this.logger.error(`Failed to register user: ${message}`);
			throw error;
		}
	}

	async login(
		identifier: string,
		password: string,
		ipAddress?: string,
		userAgent?: string,
		location?: string,
	): Promise<UserLoginResult> {
		if (!identifier || !password) {
			throw new UnauthorizedException(
				'Identifier and password are required',
			);
		}

		const user = await this.usersService.findByIdentifier(identifier);
		if (!user) {
			this.logger.warn(
				`Login attempt failed: Invalid identifier ${identifier} ${ipAddress ? `from IP ${ipAddress}` : ''}`,
			);
			throw new UnauthorizedException('Invalid credentials');
		}

		const isValid = await this.accountsService.validateCredentials(
			user.id,
			password,
		);
		if (!isValid) {
			this.logger.warn(
				`Login attempt failed: Invalid password for ${identifier} ${ipAddress ? `from IP ${ipAddress}` : ''}`,
			);
			throw new UnauthorizedException('Invalid credentials');
		}

		if (!user.emailVerified) {
			this.logger.warn(
				`Login attempt failed: Email not verified for ${identifier}`,
			);
			throw new UnauthorizedException(
				'Please verify your email before logging in.',
			);
		}

		const tokens = this.tokenService.generateJwtToken({ sub: user.id });

		if (!user.enabled2FA) {
			await this.sessionService.createSession({
				userId: user.id,
				jti: tokens.refreshJti,
				refreshToken: tokens.refreshToken,
				familyId: tokens.familyId,
				ipAddress: ipAddress ?? null,
				userAgent: userAgent ?? null,
				location: location ?? null,
				expiresAt: tokens.refreshExpiresAt,
			});
			await this.usersService.markLogin(user.id);
		}

		this.logger.log(`User logged in successfully: ${user.username}`);

		return {
			user,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		};
	}

	/**
	 * Issues a fresh token pair and rotates the refresh session in the DB.
	 * Detects stolen refresh token reuse (via SessionService.rotateRefresh)
	 * and revokes the entire family if it happens.
	 */
	async refresh(
		refreshToken: string,
		ipAddress?: string,
		userAgent?: string,
		location?: string,
	): Promise<UserRefreshResult> {
		if (!refreshToken) {
			throw new UnauthorizedException('Missing refresh token');
		}

		let payload: JwtPayload;
		try {
			payload = this.tokenService.decodeJwtToken(
				refreshToken,
				'RefreshSecret',
			);
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}

		if (!payload.sub || !payload.jti || !payload.familyId) {
			throw new UnauthorizedException('Malformed refresh token');
		}

		const newTokens = this.tokenService.generateJwtToken(
			{ sub: payload.sub },
			payload.familyId,
		);

		const session = await this.sessionService.rotateRefresh({
			oldJti: payload.jti,
			userId: payload.sub,
			newJti: newTokens.refreshJti,
			newRefreshToken: newTokens.refreshToken,
			familyId: payload.familyId,
			ipAddress: ipAddress ?? null,
			userAgent: userAgent ?? null,
			location: location ?? null,
			refreshExpiresAt: newTokens.refreshExpiresAt,
		});

		this.logger.log(
			`Refresh rotated for user ${session.user.username ?? session.user.email} (family ${payload.familyId})`,
		);

		return {
			accessToken: newTokens.accessToken,
			refreshToken: newTokens.refreshToken,
		};
	}

	async logout(refreshToken: string): Promise<void> {
		if (!refreshToken) {
			return;
		}
		try {
			const payload = this.tokenService.decodeJwtToken(
				refreshToken,
				'RefreshSecret',
			);
			if (payload.jti) {
				await this.sessionService.revokeByJti(payload.jti);
				this.logger.log(
					`Session logged out (jti=${payload.jti}, user=${payload.sub})`,
				);
			}
		} catch (error) {
			// Swallow — logout is best-effort. If the token is malformed we
			// simply clear the cookie client-side.
			this.logger.debug(
				`Logout: could not decode refresh token: ${(error as Error).message}`,
			);
		}
	}

	static readonly REFRESH_TOKEN_COOKIE = REFRESH_TOKEN_COOKIE;
	static readonly REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_MAX_AGE_MS;

	async sendWelcomeEmail(user: User) {
		await this.mailService.sendEmail(
			user.email,
			'welcome',
			'subjects.welcome',
			{
				lang: 'fr',
				name: user.username,
				dashboardLink: 'https://miks.dedyn.io/dashboard',
			},
		);
	}
}