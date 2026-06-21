import { RedisService } from '#/core/redis/redis.service';
import { Injectable, Logger } from '@nestjs/common';

const KEY_PREFIX = 'session:revoked:';

/**
 * Fast in-memory deny-list for revoked JWT ids (jti).
 *
 * Postgres remains the source of truth (Session.revokedAt), but Redis lets us
 * reject a revoked token without hitting the DB on every request.
 *
 * If Redis is unavailable we log + swallow — the SessionService falls back to
 * Prisma and the request still gets the right answer, just slower.
 */
@Injectable()
export class SessionBlacklistService {
	private readonly logger = new Logger(SessionBlacklistService.name);

	constructor(private readonly redisService: RedisService) {}

	async revoke(jti: string, ttlSeconds: number): Promise<void> {
		if (!jti || ttlSeconds <= 0) {
			return;
		}
		try {
			await this.redisService.set(KEY_PREFIX + jti, '1', ttlSeconds * 1000);
		} catch (error) {
			this.logger.warn(
				`Failed to blacklist jti in Redis (falling back to DB): ${(error as Error).message}`,
			);
		}
	}

	async isRevoked(jti: string): Promise<boolean> {
		if (!jti) return false;
		try {
			const value = await this.redisService.get<string>(KEY_PREFIX + jti);
			return value !== undefined && value !== null;
		} catch (error) {
			this.logger.warn(
				`Failed to read blacklist from Redis (falling back to DB): ${(error as Error).message}`,
			);
			return false;
		}
	}
}