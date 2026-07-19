import { AuditService } from '$lib/audit/audit.service';
import type { Prisma, Vote, VoteSubjectType } from '$prisma/client';
import type {
	VoteDecision,
	VoteResolver,
} from '$/votes/vote-resolver.interface';
import { VoteResolverRegistry } from '$/votes/vote-resolver.registry';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ActivationResult } from './project-activation.service';
import { ProjectActivationService } from './project-activation.service';

/**
 * The PROJECT side of the generalized Vote model: resolving a project vote
 * moves the Project to APPROVED/REJECTED, attempting activation in the same
 * transaction on APPROVED (spec 0004, AC-2/AC-3/AC-4). Registers itself with
 * VotesModule's VoteResolverRegistry at startup rather than VotesModule
 * depending on ProjectsModule (spec 0004, AC-13 / Decision).
 */
@Injectable()
export class ProjectVoteResolver implements VoteResolver, OnModuleInit {
	readonly subjectType: VoteSubjectType = 'PROJECT';

	constructor(
		private readonly registry: VoteResolverRegistry,
		private readonly audit: AuditService,
		private readonly activation: ProjectActivationService,
	) {}

	onModuleInit(): void {
		this.registry.register(this);
	}

	async onResolved(
		tx: Prisma.TransactionClient,
		vote: Vote,
		decision: VoteDecision,
	): Promise<ActivationResult | undefined> {
		if (!vote.projectId) {
			return undefined;
		}

		if (decision === 'REJECTED') {
			await tx.project.update({
				where: { id: vote.projectId },
				data: { status: 'REJECTED' },
			});

			return undefined;
		}

		if (decision === 'INVALID') {
			// AC-2: the project stays PENDING; any active member may open a
			// fresh vote session for it later.
			return undefined;
		}

		await tx.project.update({
			where: { id: vote.projectId },
			data: { status: 'APPROVED' },
		});

		const project = await tx.project.findUniqueOrThrow({
			where: { id: vote.projectId },
		});

		return this.activation.attempt(tx, project);
	}

	async afterResolved(
		vote: Vote,
		decision: VoteDecision,
		onResolvedResult: unknown,
	): Promise<void> {
		await this.audit.log({
			eventType: 'PROJECT_VOTE_DECIDED',
			groupId: vote.groupId,
			payload: {
				voteId: vote.id,
				projectId: vote.projectId,
				status: decision,
			},
		});

		if (decision === 'REJECTED') {
			await this.audit.log({
				eventType: 'PROJECT_REJECTED',
				groupId: vote.groupId,
				payload: { projectId: vote.projectId },
			});

			return;
		}

		if (decision !== 'APPROVED') {
			return;
		}

		await this.audit.log({
			eventType: 'PROJECT_APPROVED',
			groupId: vote.groupId,
			payload: { projectId: vote.projectId },
		});

		const activation = onResolvedResult as ActivationResult | undefined;

		if (activation?.activated) {
			await this.audit.log({
				eventType: 'PROJECT_PAYOUT_ISSUED',
				groupId: vote.groupId,
				payload: { projectId: vote.projectId },
			});

			await this.audit.log({
				eventType: 'PROJECT_ACTIVATED',
				groupId: vote.groupId,
				payload: { projectId: vote.projectId },
			});
		}
	}
}
