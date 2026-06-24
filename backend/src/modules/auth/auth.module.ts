import { AuditModule } from '#/modules/audit/audit.module';
import { MailModule } from '#/modules/email/mail.module';
import { UsersModule } from '$/users/users.module';
import { Module } from '@nestjs/common';
import { TokenModule } from '../tokens/token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from './email/email.module';
import { SessionModule } from './sessions/session.module';

@Module({
	imports: [
		AuditModule,
		MailModule,
		TokenModule,
		UsersModule,
		SessionModule,
		EmailModule,
	],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
