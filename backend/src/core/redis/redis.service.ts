import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Cache } from "cache-manager";

@Injectable()
export class RedisService implements OnModuleInit {

	private readonly logger = new Logger(RedisService.name);

	constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	onModuleInit() {
		this.cacheManager.stores.forEach((store) => {
			store.on('error', (err: Error) => {
				this.logger.error('Redis error:', err);
			});
		});

		this.logger.log('Initialized and connected to Redis.');
	}

	async set(key: string, value: any, ttl?: number) {
		await this.cacheManager.set(key, value, ttl);
	}

	async get<T>(key: string): Promise<T | undefined> {
		return this.cacheManager.get<T>(key);
	}

	async del(key: string) {
		await this.cacheManager.del(key);
	}

}