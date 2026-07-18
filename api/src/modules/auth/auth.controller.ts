import { Public } from '$common/decorators/public.decorator';
import { CurrentUser } from '$common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { TokenService } from '$lib/auth-token/token.service';
import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyDto } from './dto/verify.dto';
import { FacebookAuthGuard } from './facebook-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { VerificationService } from './verification.service';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly tokenService: TokenService,
		private readonly prisma: PrismaService,
		private readonly verificationService: VerificationService,
		private readonly config: ConfigService,
	) {}

	@Public()
	@Post('register')
	async register(
		@Body() dto: RegisterDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const user = await this.authService.register(dto);
		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
		});

		this.tokenService.setAuthCookies(res, tokens);

		return { user, ...tokens };
	}

	@Public()
	@UseGuards(LocalAuthGuard)
	// Must stay above AUTH_LOCKOUT_MAX_ATTEMPTS (default 5): equal or lower
	// budgets let the throttle's 429 fire on the very request that would
	// reach the lockout check, so the account lockout's own 423 becomes
	// unreachable within a single throttle window.
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
		});

		this.tokenService.setAuthCookies(res, tokens);

		return { user, ...tokens };
	}

	@Public()
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	async refresh(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@Body('refreshToken') bodyRefreshToken?: string,
	) {
		const rawRefreshToken =
			bodyRefreshToken ??
			(req.cookies as Record<string, string> | undefined)?.[
				TokenService.REFRESH_COOKIE
			];

		if (!rawRefreshToken) {
			throw new UnauthorizedException('No refresh token provided');
		}

		const tokens = await this.authService.rotateSession(rawRefreshToken);
		this.tokenService.setAuthCookies(res, tokens);

		return tokens;
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	async logout(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const rawRefreshToken = (
			req.cookies as Record<string, string> | undefined
		)?.[TokenService.REFRESH_COOKIE];

		if (rawRefreshToken) {
			await this.authService.revokeSessionByRefreshToken(rawRefreshToken);
		}

		this.tokenService.clearAuthCookies(res);
	}

	@Public()
	@Post('verify')
	@HttpCode(HttpStatus.OK)
	async verify(@Body() dto: VerifyDto) {
		await this.verificationService.verify(dto.token);
		return { verified: true };
	}

	@Public()
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('resend-verification')
	@HttpCode(HttpStatus.ACCEPTED)
	async resendVerification(@Body() dto: ResendVerificationDto) {
		await this.verificationService.requestVerification(dto.identifier);
	}

	@Public()
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('forgot-password')
	@HttpCode(HttpStatus.ACCEPTED)
	async forgotPassword(@Body() dto: ForgotPasswordDto) {
		await this.verificationService.requestPasswordReset(dto.identifier);
	}

	@Public()
	@Post('reset-password')
	@HttpCode(HttpStatus.OK)
	async resetPassword(@Body() dto: ResetPasswordDto) {
		await this.verificationService.resetPassword(dto.token, dto.password);
		return { reset: true };
	}

	@Get('me')
	me(@CurrentUser() user: AuthenticatedUser) {
		return user;
	}

	@Get('sessions')
	async sessions(
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
	) {
		const currentRefreshToken = (
			req.cookies as Record<string, string> | undefined
		)?.[TokenService.REFRESH_COOKIE];

		const sessions = await this.prisma.session.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: 'desc' },
		});

		return sessions.map((session) => ({
			id: session.id,
			ip: session.ip,
			userAgent: session.userAgent,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
			revoked: session.revokedAt !== null,
			current: session.refreshToken === currentRefreshToken,
		}));
	}

	@Delete('sessions/:id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async revokeSession(
		@CurrentUser() user: AuthenticatedUser,
		@Param('id') sessionId: string,
	) {
		const session = await this.prisma.session.findUnique({
			where: { id: sessionId },
		});

		if (!session) {
			throw new NotFoundException('Session not found');
		}

		if (session.userId !== user.id) {
			throw new ForbiddenException('Not your session');
		}

		await this.prisma.session.update({
			where: { id: sessionId },
			data: { revokedAt: new Date() },
		});
	}

	@Public()
	@UseGuards(GoogleAuthGuard)
	@Get('google')
	googleLogin() {
		// Guard redirects to Google; this handler never runs.
	}

	@Public()
	@UseGuards(GoogleAuthGuard)
	@Get('google/callback')
	async googleCallback(
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res() res: Response,
	) {
		await this.completeOAuthLogin(user, req, res);
	}

	@Public()
	@UseGuards(FacebookAuthGuard)
	@Get('facebook')
	facebookLogin() {
		// Guard redirects to Facebook; this handler never runs.
	}

	@Public()
	@UseGuards(FacebookAuthGuard)
	@Get('facebook/callback')
	async facebookCallback(
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res() res: Response,
	) {
		await this.completeOAuthLogin(user, req, res);
	}

	private async completeOAuthLogin(
		user: AuthenticatedUser,
		req: Request,
		res: Response,
	) {
		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
		});

		this.tokenService.setAuthCookies(res, tokens);
		res.redirect(`${this.config.oauth.webUrl}/auth/oauth-callback`);
	}
}
