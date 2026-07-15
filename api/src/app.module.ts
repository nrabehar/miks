import { JwtAuthGuard } from '$common/guards/jwt-auth.guard';
import { AuthTokenModule } from '$lib/auth-token/auth-token.module';
import { ConfigModule } from '$lib/config/config.module';
import { PrismaModule } from '$lib/database/prisma.module';
import { MailModule } from '$lib/mail/mail.module';
import { NotificationDeliveryModule } from '$lib/notification-delivery/notification-delivery.module';
import { PasswordModule } from '$lib/password/password.module';
import { WhatsappModule } from '$lib/whatsapp/whatsapp.module';
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
		MailModule,
		WhatsappModule,
		NotificationDeliveryModule,
		AuthModule,
	],
	controllers: [AppController],
	providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
