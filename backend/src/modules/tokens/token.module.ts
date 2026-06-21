import { PrismaModule } from '#/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TokenService } from './token.service';

@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule,
		PrismaModule,
	],
	providers: [TokenService],
	exports: [TokenService],
})
export class TokenModule {}
