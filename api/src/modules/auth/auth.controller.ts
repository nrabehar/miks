import { Public } from '$common/decorators/public.decorator';
import { CurrentUser } from '$common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
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
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly tokenService: TokenService,
		private readonly prisma: PrismaService,
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
}
