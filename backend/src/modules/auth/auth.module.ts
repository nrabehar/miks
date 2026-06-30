import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { TokensModule } from '../tokens/tokens.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: config.get<string>('auth.jwtAccessExpiresIn', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    TokensModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy],
  exports: [AuthService, SessionService, JwtModule],
})
export class AuthModule {}
