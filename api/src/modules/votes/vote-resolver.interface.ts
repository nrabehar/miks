import type { Prisma, Vote, VoteSubjectType } from '$prisma/client';

export type VoteDecision = 'APPROVED' | 'REJECTED' | 'INVALID';

/**
 * A domain module (groups, projects) registers exactly one of these per
 * VoteSubjectType with the VoteResolverRegistry. VotesService owns the
 * generic Vote/VoteResponse lifecycle and calls whichever resolver matches
 * when a vote closes, without ever knowing what a project or a member
 * removal is (spec 0004, AC-13).
 */
export interface VoteResolver {
	readonly subjectType: VoteSubjectType;

	/**
	 * Runs inside the same DB transaction that flips Vote.status, guarded by
	 * that update's status conditional read. Use this for any state change
	 * that must never happen twice for the same resolution (e.g. moving a
	 * member to LEFT, or attempting a project payout). Whatever it returns is
	 * handed to afterResolved once the transaction commits; VotesService is a
	 * singleton shared across concurrent requests, so this return value (not
	 * instance state) is how a resolver carries data from the transactional
	 * phase to the post-commit phase.
	 */
	onResolved(
		tx: Prisma.TransactionClient,
		vote: Vote,
		decision: VoteDecision,
	): Promise<unknown>;

	/**
	 * Runs after the transaction has committed. Use this for side effects
	 * that must not roll back with the transaction (audit logging,
	 * notifications).
	 */
	afterResolved(
		vote: Vote,
		decision: VoteDecision,
		onResolvedResult: unknown,
	): Promise<void>;
}
