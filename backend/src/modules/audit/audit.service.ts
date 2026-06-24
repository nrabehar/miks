import { PrismaService } from '#/core/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

export type AuditEvent =
	| 'auth.register'
	| 'auth.login.success'
	| 'auth.login.failed'
	| 'auth.login.locked'
	| 'auth.logout'
	| 'auth.2fa.challenge'
	| 'auth.2fa.success'
	| 'auth.2fa.failed'
	| 'auth.password.reset_request'
	| 'auth.password.reset_success'
	| 'auth.password.changed'
	| 'auth.email.verified'
	| 'auth.email.resend';

export type AuditOutcome = 'success' | 'failure' | 'blocked' | 'info';

export interface AuditContext {
	userId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name);

	constructor(private readonly prisma: PrismaService) {}

	async log(
		event: AuditEvent,
		outcome: AuditOutcome,
		ctx: AuditContext = {},
	): Promise<void> {
		try {
			await this.prisma.auditLog.create({
				data: {
					event,
					outcome,
					userId: ctx.userId ?? null,
					ipAddress: ctx.ipAddress ?? null,
					userAgent: ctx.userAgent ?? null,
					metadata: ctx.metadata
						? (ctx.metadata as object as never)
						: undefined,
				},
			});
		} catch (err) {
			// Audit MUST never break the main flow.
			this.logger.error(
				`Failed to write audit log ${event}`,
				err instanceof Error ? err.stack : String(err),
			);
		}
	}
}