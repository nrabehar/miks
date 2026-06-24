import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { KeyvCacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';
import { authConfig, databaseConfig, emailConfig } from './core/config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [databaseConfig, authConfig, emailConfig],
		}),
		ThrottlerModule.forRoot({
			throttlers: [{ ttl: 60_000, limit: 60 }],
		}),
		CacheModule.registerAsync({
			useFactory: async (configService: ConfigService) => {
				const redisUrl = configService.get<string>('database.redisUrl');
				if (!redisUrl) {
					throw new Error(
						'Redis URL is not defined in the configuration.',
					);
				}
				return {
					stores: [
						new Keyv({
							store: new KeyvCacheableMemory({
								ttl: 60000,
								lruSize: 5000,
							}),
						}),
						new KeyvRedis(redisUrl),
					],
				};
			},
			inject: [ConfigService],
			isGlobal: true,
		}),

		AuthModule,
	],
	controllers: [],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
