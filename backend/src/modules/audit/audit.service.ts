import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    workspaceId?: string;
    userId?: string;
    memberId?: string;
    event: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    try {
      await this.prisma.auditLog.create({ data: data as any });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }
}
