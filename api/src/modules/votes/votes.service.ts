import { PrismaService } from '$lib/database/prisma.service';
import type {
	GroupMember,
	Prisma,
	Vote,
	VoteResponse,
	VoteSubjectType,
} from '$prisma/client';
import { VoteChoice } from '$prisma/enums';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import type { VoteDecision } from './vote-resolver.interface';
import { VoteResolverRegistry } from './vote-resolver.registry';

export interface OpenVoteInput {
	subjectType: VoteSubjectType;
	groupId: string;
	projectId?: string;
	targetMemberId?: string;
	approvalThreshold: number;
	minQuorum: number;
	durationHours: number;
}

/**
 * Owns the Vote/VoteResponse model end to end: opening a vote, responding to
 * it, and the lazy resolution (evaluated on next read or response, no cron)
 * that both a project vote and a member removal vote share. Never knows
 * what a project or a member removal is; dispatches to whichever
 * VoteResolver is registered for the vote's subjectType (spec 0004, AC-13).
 */
@Injectable()
export class VotesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly registry: VoteResolverRegistry,
	) {}

	/**
	 * Opens a vote. Accepts an optional transaction client so a caller (e.g.
	 * project submission) can create the Project, its vaults/flow rules, and
	 * its opening Vote atomically in one transaction; defaults to the plain
	 * PrismaService for a standalone open (e.g. a removal vote proposal).
	 */
	async open(
		input: OpenVoteInput,
		tx: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<Vote> {
		return tx.vote.create({
			data: {
				subjectType: input.subjectType,
				groupId: input.groupId,
				projectId: input.projectId,
				targetMemberId: input.targetMemberId,
				approvalThreshold: input.approvalThreshold,
				minQuorum: input.minQuorum,
				durationHours: input.durationHours,
				scheduledCloseAt: new Date(
					Date.now() + input.durationHours * 60 * 60 * 1000,
				),
			},
		});
	}

	async respond(
		voteId: string,
		userId: string,
		choice: VoteChoice,
	): Promise<VoteResponse> {
		const vote = await this.resolveVote(voteId);
		const member = await this.getActiveMember(vote.groupId, userId);

		if (vote.status !== 'OPEN') {
			throw new ConflictException('This vote is already closed');
		}

		if (vote.targetMemberId === member.id) {
			throw new ForbiddenException('You cannot vote on your own removal');
		}

		const existing = await this.prisma.voteResponse.findUnique({
			where: { voteId_memberId: { voteId, memberId: member.id } },
		});

		if (existing) {
			throw new ConflictException('You already responded to this vote');
		}

		return this.prisma.voteResponse.create({
			data: { voteId, memberId: member.id, choice },
		});
	}

	async get(voteId: string, userId: string) {
		const vote = await this.resolveVote(voteId);
		await this.getActiveMember(vote.groupId, userId);

		const responses = await this.prisma.voteResponse.findMany({
			where: { voteId },
		});

		const tally = { FOR: 0, AGAINST: 0, ABSTAIN: 0 };
		for (const response of responses) {
			tally[response.choice]++;
		}

		return { ...vote, responses, tally };
	}

	async getActiveMember(
		groupId: string,
		userId: string,
	): Promise<GroupMember> {
		const member = await this.prisma.groupMember.findFirst({
			where: { groupId, userId, status: 'ACTIVE' },
		});

		if (!member) {
			throw new ForbiddenException('Not an active member of this group');
		}

		return member;
	}

	/**
	 * Reads a vote, lazily closing it first if it is still OPEN but past its
	 * scheduledCloseAt (the same no-cron convention GroupInvite expiry uses).
	 */
	async resolveVote(voteId: string): Promise<Vote> {
		const vote = await this.prisma.vote.findUnique({
			where: { id: voteId },
		});

		if (!vote) {
			throw new NotFoundException('Vote not found');
		}

		if (vote.status === 'OPEN' && vote.scheduledCloseAt < new Date()) {
			return this.closeVote(vote);
		}

		return vote;
	}

	private async closeVote(vote: Vote): Promise<Vote> {
		const responses = await this.prisma.voteResponse.findMany({
			where: { voteId: vote.id },
		});

		const forCount = responses.filter((r) => r.choice === 'FOR').length;
		const againstCount = responses.filter(
			(r) => r.choice === 'AGAINST',
		).length;
		const decisiveCount = forCount + againstCount;

		const quorumMet = responses.length >= vote.minQuorum;
		const approvalRatio =
			decisiveCount > 0 ? (forCount / decisiveCount) * 100 : 0;
		const approved =
			quorumMet && approvalRatio >= Number(vote.approvalThreshold);

		const decision: VoteDecision = !quorumMet
			? 'INVALID'
			: approved
				? 'APPROVED'
				: 'REJECTED';

		// Status conditional update: the resolver's own onResolved runs inside
		// this same transaction, so a concurrent lazy resolution of the same
		// vote can never have two resolvers both act on the decision.
		const { closed, onResolvedResult } = await this.prisma.$transaction(
			async (tx) => {
				const closedVote = await tx.vote.update({
					where: { id: vote.id },
					data: { status: decision, actualCloseAt: new Date() },
				});

				const resolver = this.registry.get(closedVote.subjectType);
				const result = resolver
					? await resolver.onResolved(tx, closedVote, decision)
					: undefined;

				return { closed: closedVote, onResolvedResult: result };
			},
			{ timeout: 15_000 },
		);

		const resolver = this.registry.get(vote.subjectType);
		if (resolver) {
			await resolver.afterResolved(closed, decision, onResolvedResult);
		}

		return closed;
	}
}
