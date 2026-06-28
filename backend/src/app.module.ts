import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { KeyvCacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';
import { AppController } from './app.controller';
import { appConfig, authConfig, databaseConfig, emailConfig } from './core/config';
import { RedisModule } from './core/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [appConfig, databaseConfig, authConfig, emailConfig],
		}),
		ThrottlerModule.forRoot({
			throttlers: [
				{ name: 'default', ttl: 60_000, limit: 60 },
				{ name: 'auth-email', ttl: 3_600_000, limit: 5 },
				{ name: 'auth-login', ttl: 900_000, limit: 10 },
				{ name: 'auth-register', ttl: 3_600_000, limit: 3 },
			],
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
		RedisModule,
		AuthModule,
		WorkspacesModule,
	],
	controllers: [AppController],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
