import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { VotesService } from '$/votes/votes.service';
import type { GroupMember, Vote } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ProposeRemovalVoteDto } from './dto/propose-removal-vote.dto';
import { ListQueryDto } from './dto/list-query.dto';

const APPROVAL_THRESHOLD_FLOOR = 50;

/**
 * Proposes a MEMBER_REMOVAL vote; the vote's own lifecycle (respond, lazy
 * resolution) lives in VotesModule's VotesService, this only validates the
 * group-membership specific submission rules and opens the vote.
 */
@Injectable()
export class RemovalVotesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		private readonly votes: VotesService,
	) {}

	async proposeRemoval(
		groupId: string,
		targetMemberId: string,
		proposer: GroupMember,
		dto: ProposeRemovalVoteDto,
	): Promise<Vote> {
		if (targetMemberId === proposer.id) {
			throw new ForbiddenException(
				'You cannot propose a removal vote against yourself',
			);
		}

		const target = await this.prisma.groupMember.findFirst({
			where: { id: targetMemberId, groupId, status: 'ACTIVE' },
		});

		if (!target) {
			throw new NotFoundException('Member not found');
		}

		const activeCount = await this.prisma.groupMember.count({
			where: { groupId, status: 'ACTIVE' },
		});
		const othersCount = activeCount - 1;

		if (othersCount < 2) {
			throw new UnprocessableEntityException(
				'A removal vote needs at least 2 other active members besides the target',
			);
		}

		const openExisting = await this.prisma.vote.findFirst({
			where: {
				groupId,
				targetMemberId,
				subjectType: 'MEMBER_REMOVAL',
				status: 'OPEN',
			},
		});

		if (openExisting) {
			throw new ConflictException(
				'An open removal vote already exists for this member',
			);
		}

		const quorumFloor = Math.floor(othersCount / 2) + 1;

		if (dto.minQuorum < quorumFloor) {
			throw new UnprocessableEntityException(
				`minQuorum must be at least ${quorumFloor} (a bare majority of the group's other active members)`,
			);
		}

		if (dto.approvalThreshold < APPROVAL_THRESHOLD_FLOOR) {
			throw new UnprocessableEntityException(
				`approvalThreshold must be at least ${APPROVAL_THRESHOLD_FLOOR}%`,
			);
		}

		const vote = await this.votes.open({
			subjectType: 'MEMBER_REMOVAL',
			groupId,
			targetMemberId,
			approvalThreshold: dto.approvalThreshold,
			minQuorum: dto.minQuorum,
			durationHours: dto.durationHours,
		});

		await this.audit.log({
			eventType: 'MEMBER_REMOVAL_VOTE_PROPOSED',
			groupId,
			actorId: proposer.userId,
			payload: { voteId: vote.id, targetMemberId },
		});

		return vote;
	}

	/**
	 * Lists a group's currently open MEMBER_REMOVAL votes, each with its full
	 * responses tally (same shape as VotesService.get), so a member other than
	 * the proposer can find and respond to a vote without already knowing its
	 * id (AC-15). Lazily resolves each candidate past its scheduledCloseAt via
	 * VotesService.resolveVote before filtering to what is still open, then
	 * batches every listed vote's VoteResponse rows in one query, never one
	 * query per vote.
	 */
	async listOpen(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const candidates = await this.prisma.vote.findMany({
			where: { groupId, subjectType: 'MEMBER_REMOVAL', status: 'OPEN' },
			orderBy: { scheduledCloseAt: 'asc' },
		});

		const resolved = await Promise.all(
			candidates.map((candidate) => this.votes.resolveVote(candidate.id)),
		);
		const stillOpen = resolved.filter((vote) => vote.status === 'OPEN');

		const total = stillOpen.length;
		const pageItems = stillOpen.slice(
			(page - 1) * limit,
			(page - 1) * limit + limit,
		);

		const responses = await this.prisma.voteResponse.findMany({
			where: { voteId: { in: pageItems.map((vote) => vote.id) } },
		});

		const data = pageItems.map((vote) => {
			const tally = { FOR: 0, AGAINST: 0, ABSTAIN: 0 };
			const voteResponses = responses.filter((r) => r.voteId === vote.id);
			for (const response of voteResponses) {
				tally[response.choice]++;
			}

			return { ...vote, responses: voteResponses, tally };
		});

		return { data, page, limit, total };
	}
}
