import { GetLang } from '#/common/decorators/get-lang.decorator';
import { Public } from '#/common/decorators/public.decorator';
import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dtos/user-login.dto';
import { UserRegisterDto } from './dtos/user-register.dto';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly userAuthService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Public()
	@Post('register')
	async registerUser(@Body() body: UserRegisterDto, @GetLang() lang: string) {
		const { firstName, lastName, email, password } = body;
		await this.userAuthService.register(email, firstName, lastName, password, lang);

		return {
			message:
				'User registered successfully. Please check your email for verification instructions.',
		};
	}
	
	@Public()
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

		const { user, accessToken, refreshToken } =
			await this.userAuthService.login(
				identifier,
				password,
				ipAddress,
				userAgent,
			);

		if (user.enabled2FA) {
			res.clearCookie(AuthService.REFRESH_TOKEN_COOKIE);
			return res.status(HttpStatus.OK).json({
				twoFaRequired: true,
				user,
				accessToken,
			});
		}

		this.setRefreshCookie(res, refreshToken);

		return res
			.status(HttpStatus.OK)
			.json({ user, accessToken, twoFaRequired: false });
	}

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
			await this.userAuthService.refresh(
				refreshToken,
				ipAddress,
				userAgent,
			);

		this.setRefreshCookie(res, newRefreshToken);

		return res.status(HttpStatus.OK).json({ accessToken });
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
		const refreshToken = this.extractRefreshToken(req);
		await this.userAuthService.logout(refreshToken ?? '');

		res.clearCookie(AuthService.REFRESH_TOKEN_COOKIE, {
			httpOnly: true,
			secure: this.configService.get('app.nodeEnv') === 'production',
			sameSite: 'strict',
		});
		res.status(HttpStatus.NO_CONTENT).send();
	}

	private setRefreshCookie(res: Response, refreshToken: string): void {
		res.cookie(
			AuthService.REFRESH_TOKEN_COOKIE,
			refreshToken,
			{
				httpOnly: true,
				secure: this.configService.get('app.nodeEnv') === 'production',
				sameSite: 'strict',
				maxAge: AuthService.REFRESH_TOKEN_MAX_AGE_MS,
				path: '/',
			},
		);
	}

	private extractRefreshToken(req: Request): string | undefined {
		const fromCookie = (req as Request & {
			cookies?: Record<string, string | undefined>;
		}).cookies?.[AuthService.REFRESH_TOKEN_COOKIE];
		if (fromCookie) return fromCookie;

		// Fallback: allow header for non-browser clients (e.g. mobile).
		const header = req.headers['x-refresh-token'];
		if (typeof header === 'string') return header;

		return undefined;
	}
}