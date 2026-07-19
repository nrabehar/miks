import { AuditService } from '$lib/audit/audit.service';
import type { Prisma, Vote, VoteSubjectType } from '$prisma/client';
import type {
	VoteDecision,
	VoteResolver,
} from '$/votes/vote-resolver.interface';
import { VoteResolverRegistry } from '$/votes/vote-resolver.registry';
import { Injectable, OnModuleInit } from '@nestjs/common';

/**
 * The MEMBER_REMOVAL side of the generalized Vote model: resolving a removal
 * vote APPROVED moves the target member to LEFT, inside the same
 * status-guarded transaction VotesService closes the vote in. Registers
 * itself with VotesModule's VoteResolverRegistry at startup rather than
 * VotesModule depending on GroupsModule (spec 0004, AC-13 / Decision).
 */
@Injectable()
export class MemberRemovalVoteResolver implements VoteResolver, OnModuleInit {
	readonly subjectType: VoteSubjectType = 'MEMBER_REMOVAL';

	constructor(
		private readonly registry: VoteResolverRegistry,
		private readonly audit: AuditService,
	) {}

	onModuleInit(): void {
		this.registry.register(this);
	}

	async onResolved(
		tx: Prisma.TransactionClient,
		vote: Vote,
		decision: VoteDecision,
	): Promise<void> {
		if (decision === 'APPROVED' && vote.targetMemberId) {
			await tx.groupMember.update({
				where: { id: vote.targetMemberId },
				data: { status: 'LEFT', leftAt: new Date() },
			});
		}
	}

	async afterResolved(vote: Vote, decision: VoteDecision): Promise<void> {
		// This resolver's onResolved has nothing worth carrying to this phase.
		await this.audit.log({
			eventType: 'MEMBER_REMOVAL_VOTE_DECIDED',
			groupId: vote.groupId,
			payload: { voteId: vote.id, status: decision },
		});

		if (decision === 'APPROVED') {
			await this.audit.log({
				eventType: 'MEMBER_REMOVED',
				groupId: vote.groupId,
				payload: {
					voteId: vote.id,
					targetMemberId: vote.targetMemberId,
				},
			});
		}
	}
}
