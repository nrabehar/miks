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
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfirmDeviceDto } from './dto/confirm-device.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendDeviceConfirmationDto } from './dto/resend-device-confirmation.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyDto } from './dto/verify.dto';
import type { RequestWithDeviceId } from './device-id.middleware';
import { parseDeviceInfo } from './device-info.util';
import { DeviceService } from './device.service';
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
		private readonly deviceService: DeviceService,
		private readonly config: ConfigService,
	) {}

	@Public()
	@Post('register')
	async register(
		@Body() dto: RegisterDto,
		@Req() req: RequestWithDeviceId,
		@Res({ passthrough: true }) res: Response,
	) {
		const user = await this.authService.register(dto);
		const device = await this.deviceService.identifyForRegister(
			user.id,
			req.deviceId,
			{ userAgent: req.headers['user-agent'], ip: req.ip },
		);
		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
			deviceId: device.id,
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
		@Req() req: RequestWithDeviceId,
		@Res({ passthrough: true }) res: Response,
	) {
		const resolution = await this.deviceService.identifyForLogin(
			user.id,
			req.deviceId,
			{ userAgent: req.headers['user-agent'], ip: req.ip },
		);

		if (resolution.requiresConfirmation) {
			return {
				requiresDeviceConfirmation: true,
				confirmationId: resolution.confirmationId,
			};
		}

		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
			deviceId: resolution.device.id,
		});

		this.tokenService.setAuthCookies(res, tokens);

		return { user, ...tokens };
	}

	@Public()
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('device/confirm')
	@HttpCode(HttpStatus.OK)
	async confirmDevice(
		@Body() dto: ConfirmDeviceDto,
		@Req() req: RequestWithDeviceId,
		@Res({ passthrough: true }) res: Response,
	) {
		const device = await this.deviceService.confirm(
			dto.confirmationId,
			dto.code,
		);

		const user = await this.authService.getAuthenticatedIdentity(
			device.userId,
		);

		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
			deviceId: device.id,
		});

		this.tokenService.setAuthCookies(res, tokens);

		return { user, ...tokens };
	}

	@Public()
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('device/resend-confirmation')
	@HttpCode(HttpStatus.ACCEPTED)
	async resendDeviceConfirmation(@Body() dto: ResendDeviceConfirmationDto) {
		await this.deviceService.resendConfirmation(dto.confirmationId);
	}

	@Public()
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	async refresh(
		@Req() req: RequestWithDeviceId,
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
		@Req() req: RequestWithDeviceId,
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
		@Req() req: RequestWithDeviceId,
	) {
		const currentRefreshToken = (
			req.cookies as Record<string, string> | undefined
		)?.[TokenService.REFRESH_COOKIE];

		const sessions = await this.prisma.session.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: 'desc' },
			include: { device: true },
		});

		return sessions.map((session) => {
			const info = session.device
				? {
						type: session.device.type,
						platform: session.device.platform,
						deviceName: session.device.deviceName,
					}
				: parseDeviceInfo(session.userAgent ?? undefined);

			return {
				id: session.id,
				ip: session.ip,
				userAgent: session.userAgent,
				deviceName: info.deviceName,
				deviceType: info.type,
				platform: info.platform,
				lastActiveAt: session.device?.lastActiveAt ?? session.createdAt,
				createdAt: session.createdAt,
				expiresAt: session.expiresAt,
				revoked: session.revokedAt !== null,
				current: session.refreshToken === currentRefreshToken,
			};
		});
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
		await this.deviceService.revokeByDeviceId(session.deviceId);
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
		@Req() req: RequestWithDeviceId,
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
		@Req() req: RequestWithDeviceId,
		@Res() res: Response,
	) {
		await this.completeOAuthLogin(user, req, res);
	}

	private async completeOAuthLogin(
		user: AuthenticatedUser,
		req: RequestWithDeviceId,
		res: Response,
	) {
		const resolution = await this.deviceService.identifyForLogin(
			user.id,
			req.deviceId,
			{ userAgent: req.headers['user-agent'], ip: req.ip },
		);

		if (resolution.requiresConfirmation) {
			const url = new URL(
				`${this.config.oauth.webUrl}/auth/oauth-callback`,
			);
			url.searchParams.set('requiresDeviceConfirmation', 'true');
			url.searchParams.set(
				'confirmationId',
				resolution.confirmationId ?? '',
			);
			res.redirect(url.toString());
			return;
		}

		const tokens = await this.authService.createSession(user, {
			userAgent: req.headers['user-agent'],
			ip: req.ip,
			deviceId: resolution.device.id,
		});

		this.tokenService.setAuthCookies(res, tokens);
		res.redirect(`${this.config.oauth.webUrl}/auth/oauth-callback`);
	}
}
