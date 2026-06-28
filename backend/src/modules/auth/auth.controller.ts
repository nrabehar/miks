import { GetLang } from '#/common/decorators/get-lang.decorator';
import { Public } from '#/common/decorators/public.decorator';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResendEmailDto } from './dtos/resend-email.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UserLoginDto } from './dtos/user-login.dto';
import { UserRegisterDto } from './dtos/user-register.dto';
import { Toggle2FADto } from './dtos/toggle-2fa.dto';
import { Verify2FADto } from './dtos/verify-2fa.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
	private readonly isProduction =
		process.env.NODE_ENV === 'production';

	private readonly cookieOptions = {
		httpOnly: true as const,
		secure: this.isProduction,
		sameSite: 'strict' as const,
		path: '/',
	};

	constructor(
		private readonly userAuthService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Public()
	@Throttle({ 'auth-register': { ttl: 3_600_000, limit: 3 } })
	@Post('register')
	async registerUser(@Body() body: UserRegisterDto, @GetLang() lang: string) {
		const { firstName, lastName, email, password } = body;
		const result = await this.userAuthService.register(email, firstName, lastName, password, lang);
		return result;
	}

	@Public()
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 10 } })
	@Post('verify-email')
	@HttpCode(HttpStatus.OK)
	async verifyEmail(@Body() body: VerifyEmailDto) {
		await this.userAuthService.verifyEmail(body.registrationId, body.code);
		return { ok: true };
	}

	@Public()
	@Throttle({ 'auth-email': { ttl: 3_600_000, limit: 5 } })
	@Post('resend-email')
	@HttpCode(HttpStatus.OK)
	async resendEmail(@Body() body: ResendEmailDto, @GetLang() lang: string) {
		await this.userAuthService.resendEmailCode(body.registrationId, lang);
		return { ok: true };
	}

	@Public()
	@Throttle({ 'auth-email': { ttl: 3_600_000, limit: 5 } })
	@Post('forgot-password')
	@HttpCode(HttpStatus.OK)
	async forgotPassword(@Body() body: ForgotPasswordDto, @GetLang() lang: string) {
		await this.userAuthService.forgotPassword(body.email, lang);
		return { ok: true };
	}

	@Public()
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 5 } })
	@Post('reset-password')
	@HttpCode(HttpStatus.OK)
	async resetPassword(@Body() body: ResetPasswordDto) {
		await this.userAuthService.resetPassword(body.userId, body.code, body.newPassword);
		return { ok: true };
	}

	@Public()
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 5 } })
	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(
		@Req() req: Request,
		@Res() res: Response,
		@Body() data: UserLoginDto,
	) {
		const { identifier, password } = data;
		const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
		const userAgent = req.headers['user-agent'];

		const { user, accessToken, refreshToken } = await this.userAuthService.login(
			identifier,
			password,
			ipAddress,
			userAgent,
		);

		if (user.twoFaEnabled) {
			res.clearCookie(AuthService.REFRESH_TOKEN_COOKIE);
			return res.status(HttpStatus.OK).json({
				requires2FA: true,
				challengeId: user.id,
			});
		}

		this.setRefreshCookie(res, refreshToken);
		return res.status(HttpStatus.OK).json({ requires2FA: false, user, accessToken });
	}

	@Public()
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 5 } })
	@Post('2fa/verify')
	@HttpCode(HttpStatus.OK)
	async verify2FA(
		@Req() req: Request,
		@Res() res: Response,
		@Body() data: Verify2FADto,
	) {
		const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
		const userAgent = req.headers['user-agent'];

		const { user, accessToken, refreshToken } =
			await this.userAuthService.verify2FALogin(
				data.challengeId,
				data.code,
				ipAddress,
				userAgent,
			);

		this.setRefreshCookie(res, refreshToken);
		return res
			.status(HttpStatus.OK)
			.json({ user, accessToken, requires2FA: false });
	}

	@Public()
	@Throttle({ 'auth-login': { ttl: 60_000, limit: 30 } })
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	async refresh(@Req() req: Request, @Res() res: Response) {
		const refreshToken = this.extractRefreshToken(req);
		if (!refreshToken) {
			throw new UnauthorizedException('Missing refresh token cookie');
		}

		const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
		const userAgent = req.headers['user-agent'];

		const { accessToken, refreshToken: newRefreshToken } =
			await this.userAuthService.refresh(refreshToken, ipAddress, userAgent);

		this.setRefreshCookie(res, newRefreshToken);
		return res.status(HttpStatus.OK).json({ accessToken });
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
		const refreshToken = this.extractRefreshToken(req);
		await this.userAuthService.logout(refreshToken ?? '');

		res.clearCookie(AuthService.REFRESH_TOKEN_COOKIE, this.cookieOptions);
		res.status(HttpStatus.NO_CONTENT).send();
	}

	// ─── 2FA Management ─────────────────────────────────────────────────────────

	/**
	 * Generate a new 2FA TOTP secret for the authenticated user.
	 * The response includes the otpauth URL for QR-code rendering and the raw
	 * base32 secret (for manual entry). No changes are persisted until the user
	 * calls POST /auth/2fa/enable with a valid code.
	 */
	@UseGuards(JwtAuthGuard)
	@Post('2fa/setup')
	@HttpCode(HttpStatus.OK)
	async setup2FA(@Req() req: Request) {
		const sub = this.extractSub(req);
		return this.userAuthService.setup2FA(sub);
	}

	/** Enable 2FA after scanning the QR code — verifies a live TOTP code first */
	@UseGuards(JwtAuthGuard)
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 5 } })
	@Post('2fa/enable')
	@HttpCode(HttpStatus.OK)
	async enable2FA(@Req() req: Request, @Body() body: Toggle2FADto) {
		const sub = this.extractSub(req);
		await this.userAuthService.enable2FA(sub, body.code);
		return { ok: true };
	}

	/** Disable 2FA — requires a valid TOTP code to prevent accidental lockout */
	@UseGuards(JwtAuthGuard)
	@Throttle({ 'auth-login': { ttl: 900_000, limit: 5 } })
	@Post('2fa/disable')
	@HttpCode(HttpStatus.OK)
	async disable2FA(@Req() req: Request, @Body() body: Toggle2FADto) {
		const sub = this.extractSub(req);
		await this.userAuthService.disable2FA(sub, body.code);
		return { ok: true };
	}

	// ─── Current User ───────────────────────────────────────────────────────────

	/**
	 * Returns the currently-authenticated user (resolved from the JWT in
	 * `Authorization: Bearer …`). Used by the frontend to re-hydrate the
	 * auth store on page reload — since the access token is kept in memory
	 * only, this endpoint lets us recover the user object without forcing
	 * a login.
	 */
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Req() req: Request) {
		const sub = this.extractSub(req);
		const user = await this.userAuthService.getMe(sub);
		return user;
	}

	private extractSub(req: Request): string {
		const sub = (req as Request & { user?: { sub?: string } }).user?.sub;
		if (!sub) throw new UnauthorizedException('Invalid token payload');
		return sub;
	}

	private setRefreshCookie(res: Response, refreshToken: string): void {
		res.cookie(AuthService.REFRESH_TOKEN_COOKIE, refreshToken, {
			...this.cookieOptions,
			maxAge: AuthService.REFRESH_TOKEN_MAX_AGE_MS,
			signed: true,
		});
	}

	private extractRefreshToken(req: Request): string | undefined {
		const cookies = (req as Request & {
			cookies?: Record<string, string | undefined>;
			signedCookies?: Record<string, string | undefined>;
		}).cookies;
		const signedCookies = (req as Request & {
			signedCookies?: Record<string, string | undefined>;
		}).signedCookies;
		return (
			signedCookies?.[AuthService.REFRESH_TOKEN_COOKIE] ??
			cookies?.[AuthService.REFRESH_TOKEN_COOKIE]
		);
	}
}
