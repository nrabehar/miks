import { AuditModule } from '#/modules/audit/audit.module';
import { MailModule } from '#/modules/email/mail.module';
import { UsersModule } from '$/users/users.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TokenModule } from '../tokens/token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from './email/email.module';
import { SessionModule } from './sessions/session.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'jwt' }),
		AuditModule,
		MailModule,
		TokenModule,
		UsersModule,
		SessionModule,
		EmailModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
