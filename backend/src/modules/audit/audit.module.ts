import { PrismaModule } from '#/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

@Module({
	imports: [PrismaModule],
	providers: [AuditService],
	exports: [AuditService],
})
export class AuditModule {}