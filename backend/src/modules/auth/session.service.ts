import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createSession(userId: string, userAgent?: string, ip?: string) {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    const ua = new UAParser(userAgent).getResult();

    const payload: JwtPayload = { sub: userId, jti };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('auth.jwtAccessExpiresIn', '15m') as any,
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('auth.jwtRefreshExpiresIn', '7d') as any,
    });

    await this.prisma.session.create({
      data: {
        userId,
        jti,
        tokenHash: hashToken(refreshToken),
        userAgent: userAgent ?? null,
        ipAddress: ip ?? null,
        device: ua.device.type ?? null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshSession(refreshToken: string, userAgent?: string, ip?: string) {
    const payload = this.jwt.verify<JwtPayload>(refreshToken, {
      secret: this.config.get<string>('auth.jwtSecret'),
    });

    const session = await this.prisma.session.findUnique({ where: { jti: payload.jti } });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.tokenHash !== hashToken(refreshToken)
    ) {
      // Possible token theft — revoke current session
      if (session) {
        await this.prisma.session.update({
          where: { jti: payload.jti },
          data: { revokedAt: new Date() },
        });
      }
      throw new Error('Invalid refresh token');
    }

    await this.prisma.session.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date() },
    });

    return this.createSession(payload.sub, userAgent, ip);
  }

  async revokeSession(jti: string) {
    await this.prisma.session.update({
      where: { jti },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
