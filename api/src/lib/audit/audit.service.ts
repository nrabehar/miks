import { PrismaService } from '$lib/database/prisma.service';
import type { Prisma } from '$prisma/client';
import { Injectable } from '@nestjs/common';

export interface AuditLogEntry {
	eventType: string;
	groupId?: string;
	actorId?: string;
	payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
	constructor(private readonly prisma: PrismaService) {}

	async log(entry: AuditLogEntry): Promise<void> {
		await this.prisma.auditLog.create({
			data: {
				eventType: entry.eventType,
				groupId: entry.groupId,
				actorId: entry.actorId,
				payload: (entry.payload ?? {}) as Prisma.InputJsonValue,
			},
		});
	}
}
