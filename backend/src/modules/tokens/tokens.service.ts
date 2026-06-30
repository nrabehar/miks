import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../core/redis/redis.service.js';

const EMAIL_CODE_TTL = 15 * 60 * 1000;  // 15 min
const RESET_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

@Injectable()
export class TokensService {
  constructor(private readonly redis: RedisService) {}

  async generateEmailCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`email_code:${userId}`, code, EMAIL_CODE_TTL);
    return code;
  }

  async verifyEmailCode(userId: string, code: string): Promise<void> {
    const stored = await this.redis.get<string>(`email_code:${userId}`);
    if (!stored || stored !== code) throw new BadRequestException('Invalid or expired verification code');
    await this.redis.del(`email_code:${userId}`);
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const token = randomUUID();
    await this.redis.set(`pwd_reset:${userId}`, token, RESET_TOKEN_TTL);
    return token;
  }

  async verifyPasswordResetToken(userId: string, token: string): Promise<void> {
    const stored = await this.redis.get<string>(`pwd_reset:${userId}`);
    if (!stored || stored !== token) throw new BadRequestException('Invalid or expired reset token');
    await this.redis.del(`pwd_reset:${userId}`);
  }
}
