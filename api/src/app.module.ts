import { JwtAuthGuard } from '$common/guards/jwt-auth.guard';
import { AuthTokenModule } from '$lib/auth-token/auth-token.module';
import { ConfigModule } from '$lib/config/config.module';
import { PrismaModule } from '$lib/database/prisma.module';
import { PasswordModule } from '$lib/password/password.module';
import { AuthModule } from '$/auth/auth.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
	imports: [
		ConfigModule,
		PrismaModule,
		AuthTokenModule,
		PasswordModule,
		AuthModule,
	],
	controllers: [AppController],
	providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
