import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { RedisModule } from './core/redis/redis.module.js';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor.js';
import { SanitizerInterceptor } from './core/interceptors/sanitizer.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import appConfig from './config/app.config.js';
import authConfig from './config/auth.config.js';
import emailConfig from './config/email.config.js';
import redisConfig from './config/redis.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, emailConfig, redisConfig],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SanitizerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
