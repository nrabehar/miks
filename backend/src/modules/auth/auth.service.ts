import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as speakeasy from 'speakeasy';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { EmailService } from '../email/email.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import { AccountsService } from '../users/accounts.service.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { SessionService } from './session.service.js';

const TEMP_2FA_TTL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly users: UsersService,
    private readonly accounts: AccountsService,
    private readonly tokens: TokensService,
    private readonly email: EmailService,
    private readonly sessions: SessionService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const { hash, salt } = await this.accounts.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName ?? null,
        phone: dto.phone ?? null,
        accounts: {
          create: {
            providerId: 'credential',
            accountId: dto.email,
            password: hash,
            passwordSalt: salt,
          },
        },
      },
      select: { id: true, email: true, firstName: true, lastName: true, emailVerified: true },
    });

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const code = await this.tokens.generateEmailCode(user.id);
    await this.email.sendVerificationCode(user.email, displayName, code);

    return { userId: user.id, message: 'Verification code sent to your email' };
  }

  async verifyEmail(userId: string, code: string) {
    await this.tokens.verifyEmailCode(userId, code);
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    return { verified: true };
  }

  async resendEmailCode(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) throw new BadRequestException('Email already verified');

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const code = await this.tokens.generateEmailCode(userId);
    await this.email.sendVerificationCode(user.email, displayName, code);
    return { message: 'Code resent' };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { accounts: { where: { providerId: 'credential' } } },
    });

    if (!user || !user.accounts[0]) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account temporarily locked. Try again later');
    }

    const account = user.accounts[0];
    const valid = await this.accounts.verifyPassword(
      dto.password,
      account.password!,
      account.passwordSalt!,
    );

    if (!valid) {
      const failed = user.failedLoginAttempts + 1;
      const lockUpdate =
        failed >= MAX_FAILED_ATTEMPTS
          ? { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS), failedLoginAttempts: 0 }
          : { failedLoginAttempts: failed };
      await this.prisma.user.update({ where: { id: user.id }, data: lockUpdate });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    if (user.twoFaEnabled) {
      const tempToken = randomUUID();
      await this.redis.set(`2fa_pending:${tempToken}`, user.id, TEMP_2FA_TTL_MS);
      return { requiresTwoFa: true, tempToken };
    }

    const tokens = await this.sessions.createSession(user.id, userAgent, ip);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), isOnline: true },
    });

    return { requiresTwoFa: false, ...tokens, user: this.formatUser(user) };
  }

  async verifyTwoFaLogin(tempToken: string, code: string, userAgent?: string, ip?: string) {
    const userId = await this.redis.get<string>(`2fa_pending:${tempToken}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired 2FA session');

    const user = await this.users.findById(userId);
    if (!user?.twoFaSecret) throw new UnauthorizedException('2FA not configured');

    const valid = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.redis.del(`2fa_pending:${tempToken}`);
    const tokens = await this.sessions.createSession(userId, userAgent, ip);
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), isOnline: true },
    });

    return { ...tokens, user: this.formatUser(user) };
  }

  async refresh(refreshToken: string, userAgent?: string, ip?: string) {
    return this.sessions.refreshSession(refreshToken, userAgent, ip);
  }

  async logout(jti: string) {
    await this.sessions.revokeSession(jti);
    return { message: 'Logged out' };
  }

  async setupTwoFa(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const secret = speakeasy.generateSecret({ name: `MIKS (${user.email})`, length: 20 });
    await this.redis.set(`2fa_setup:${userId}`, secret.base32, 10 * 60 * 1000);

    return { secret: secret.base32, otpAuthUrl: secret.otpauth_url };
  }

  async enableTwoFa(userId: string, code: string) {
    const secret = await this.redis.get<string>(`2fa_setup:${userId}`);
    if (!secret) throw new BadRequestException('No pending 2FA setup. Call setup first');

    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret, twoFaEnabled: true },
    });
    await this.redis.del(`2fa_setup:${userId}`);
    return { enabled: true };
  }

  async disableTwoFa(userId: string, code: string) {
    const user = await this.users.findById(userId);
    if (!user?.twoFaEnabled) throw new BadRequestException('2FA is not enabled');

    const valid = speakeasy.totp.verify({
      secret: user.twoFaSecret!,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: false, twoFaSecret: null },
    });
    return { disabled: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const token = await this.tokens.generatePasswordResetToken(user.id);
    await this.email.sendPasswordReset(email, displayName, user.id, token);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(userId: string, token: string, newPassword: string) {
    await this.tokens.verifyPasswordResetToken(userId, token);
    const { hash, salt } = await this.accounts.hashPassword(newPassword);
    await this.prisma.account.updateMany({
      where: { userId, providerId: 'credential' },
      data: { password: hash, passwordSalt: salt },
    });
    await this.sessions.revokeAllForUser(userId);
    return { message: 'Password reset successfully' };
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      emailVerified: user.emailVerified,
      twoFaEnabled: user.twoFaEnabled,
      language: user.language,
    };
  }
}
