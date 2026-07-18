import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import type { Prisma, Project } from '$prisma/client';
import { Injectable } from '@nestjs/common';

export interface ActivationResult {
	project: Project;
	activated: boolean;
}

/**
 * Attempts to activate an APPROVED project: debit its sourceVault, credit
 * its payoutVault (if any), move it to ACTIVE (spec 0004, AC-3/AC-4). Shared
 * by the PROJECT vote resolver (called the moment a vote resolves APPROVED)
 * and the lazy retry on a project's next read (AC-4), so both paths use the
 * exact same guards.
 */
@Injectable()
export class ProjectActivationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	/**
	 * Runs inside the caller's own transaction (the vote-resolution
	 * transaction, or one this service opens itself via retryIfApproved).
	 * Never opens its own transaction, so it composes safely either way.
	 */
	async attempt(
		tx: Prisma.TransactionClient,
		project: Project,
	): Promise<ActivationResult> {
		if (project.status !== 'APPROVED' || !project.sourceVaultId) {
			return { project, activated: false };
		}

		// Balance conditional update: only succeeds while sourceVault's balance
		// still covers requestedBudget at the moment of the write, independent
		// of the project status guard below (AC-3's second guard: sourceVault
		// is a shared GROUP vault, not owned by one project).
		const debited = await tx.vault.updateMany({
			where: {
				id: project.sourceVaultId,
				cachedBalance: { gte: project.requestedBudget },
			},
			data: { cachedBalance: { decrement: project.requestedBudget } },
		});

		if (debited.count === 0) {
			// Insufficient funds: stays APPROVED, retried lazily later (AC-4).
			return { project, activated: false };
		}

		// Status conditional update: only proceed while the project row still
		// reads APPROVED, so two concurrent activation attempts on the same
		// project (a vote resolution racing a lazy GET retry, or two GETs)
		// can never both execute the payout.
		const claimed = await tx.project.updateMany({
			where: { id: project.id, status: 'APPROVED' },
			data: { status: 'ACTIVE' },
		});

		if (claimed.count === 0) {
			// Lost the race to activate this project; undo the optimistic debit.
			await tx.vault.update({
				where: { id: project.sourceVaultId },
				data: { cachedBalance: { increment: project.requestedBudget } },
			});

			return { project, activated: false };
		}

		await tx.transaction.create({
			data: {
				groupId: project.groupId,
				vaultId: project.sourceVaultId,
				direction: 'DEBIT',
				amount: project.requestedBudget,
				type: 'PROJECT_PAYOUT',
				sourceType: 'PROJECT_PAYOUT',
				sourceRefId: project.id,
			},
		});

		if (project.payoutVaultId) {
			await tx.vault.update({
				where: { id: project.payoutVaultId },
				data: { cachedBalance: { increment: project.requestedBudget } },
			});

			await tx.transaction.create({
				data: {
					groupId: project.groupId,
					vaultId: project.payoutVaultId,
					direction: 'CREDIT',
					amount: project.requestedBudget,
					type: 'PROJECT_PAYOUT',
					sourceType: 'PROJECT_PAYOUT',
					sourceRefId: project.id,
				},
			});
		}

		const activated = await tx.project.findUniqueOrThrow({
			where: { id: project.id },
		});

		return { project: activated, activated: true };
	}

	/**
	 * The lazy retry entry point (AC-4): opens its own transaction around
	 * attempt(), for a project read outside of any vote resolution.
	 */
	async retryIfApproved(project: Project): Promise<Project> {
		if (project.status !== 'APPROVED') {
			return project;
		}

		const result = await this.prisma.$transaction((tx) =>
			this.attempt(tx, project),
		);

		if (result.activated) {
			await this.audit.log({
				eventType: 'PROJECT_PAYOUT_ISSUED',
				groupId: project.groupId,
				payload: { projectId: project.id },
			});

			await this.audit.log({
				eventType: 'PROJECT_ACTIVATED',
				groupId: project.groupId,
				payload: { projectId: project.id },
			});
		}

		return result.project;
	}
}
