import { PrismaModule } from '#/core/prisma/prisma.module';
import { TokenModule } from '#/modules/tokens/token.module';
import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
	imports: [PrismaModule, TokenModule],
	controllers: [EmailController],
	providers: [EmailService],
	exports: [EmailService],
})
export class EmailModule {}
