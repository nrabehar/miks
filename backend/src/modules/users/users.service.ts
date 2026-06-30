import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { RedisService } from '../../core/redis/redis.service.js';

const USER_CACHE_TTL = 60_000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findById(id: string) {
    const cached = await this.redis.get<any>(`user:${id}`);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) await this.redis.set(`user:${id}`, user, USER_CACHE_TTL);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      avatarUrl: string;
      phone: string;
      language: string;
    }>,
  ) {
    const updated = await this.prisma.user.update({ where: { id }, data });
    await this.redis.del(`user:${id}`);
    return updated;
  }

  async invalidateCache(id: string) {
    await this.redis.del(`user:${id}`);
  }
}
