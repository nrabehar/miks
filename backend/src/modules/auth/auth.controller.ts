import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto, VerifyEmailDto, ResendEmailDto } from './dto/login.dto.js';
import { TwoFaCodeDto, TwoFaVerifyLoginDto } from './dto/two-fa.dto.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto.js';
import { Public } from '../../core/decorators/public.decorator.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.userId, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post('resend-email')
  resendEmail(@Body() dto: ResendEmailDto) {
    return this.auth.resendEmailCode(dto.userId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, req.headers['user-agent'], req.ip);
    if (!result.requiresTwoFa && (result as any).refreshToken) {
      res.cookie(COOKIE_NAME, (result as any).refreshToken, COOKIE_OPTS);
    }
    const { refreshToken: _, ...safe } = result as any;
    return safe;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('2fa/verify')
  async verifyTwoFaLogin(
    @Body() dto: TwoFaVerifyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyTwoFaLogin(dto.tempToken, dto.code, req.headers['user-agent'], req.ip);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    const { refreshToken: _, ...safe } = result;
    return safe;
  }

  @Post('2fa/setup')
  setupTwoFa(@CurrentUser() user: { id: string }) {
    return this.auth.setupTwoFa(user.id);
  }

  @Post('2fa/enable')
  enableTwoFa(@CurrentUser() user: { id: string }, @Body() dto: TwoFaCodeDto) {
    return this.auth.enableTwoFa(user.id, dto.code);
  }

  @Post('2fa/disable')
  disableTwoFa(@CurrentUser() user: { id: string }, @Body() dto: TwoFaCodeDto) {
    return this.auth.disableTwoFa(user.id, dto.code);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedException('No refresh token');
    const result = await this.auth.refresh(token, req.headers['user-agent'], req.ip);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    const { refreshToken: _, ...safe } = result;
    return safe;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@CurrentUser() user: { jti: string }, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return this.auth.logout(user.jti);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.userId, dto.token, dto.newPassword);
  }

  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    const full = await this.users.findById(user.id);
    if (!full) throw new UnauthorizedException();
    return {
      id: full.id,
      email: full.email,
      firstName: full.firstName,
      lastName: full.lastName,
      avatarUrl: full.avatarUrl,
      phone: full.phone,
      emailVerified: full.emailVerified,
      phoneVerified: full.phoneVerified,
      twoFaEnabled: full.twoFaEnabled,
      language: full.language,
      isOnline: full.isOnline,
    };
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    const updated = await this.users.updateProfile(user.id, dto);
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatarUrl: updated.avatarUrl,
      phone: updated.phone,
      language: updated.language,
    };
  }
}
