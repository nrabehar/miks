import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import type { GroupMember, Vote, VoteResponse } from '$prisma/client';
import { VoteChoice } from '$prisma/enums';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ProposeRemovalVoteDto } from './dto/propose-removal-vote.dto';

const APPROVAL_THRESHOLD_FLOOR = 50;

@Injectable()
export class VotesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
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

		const vote = await this.prisma.vote.create({
			data: {
				subjectType: 'MEMBER_REMOVAL',
				groupId,
				targetMemberId,
				approvalThreshold: dto.approvalThreshold,
				minQuorum: dto.minQuorum,
				durationHours: dto.durationHours,
				scheduledCloseAt: new Date(
					Date.now() + dto.durationHours * 60 * 60 * 1000,
				),
			},
		});

		await this.audit.log({
			eventType: 'MEMBER_REMOVAL_VOTE_PROPOSED',
			groupId,
			actorId: proposer.userId,
			payload: { voteId: vote.id, targetMemberId },
		});

		return vote;
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

	private async getActiveMember(
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

	private async resolveVote(voteId: string): Promise<Vote> {
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

		const newStatus = !quorumMet
			? 'INVALID'
			: approved
				? 'APPROVED'
				: 'REJECTED';

		const updated = await this.prisma.$transaction(async (tx) => {
			const closed = await tx.vote.update({
				where: { id: vote.id },
				data: { status: newStatus, actualCloseAt: new Date() },
			});

			if (
				newStatus === 'APPROVED' &&
				closed.subjectType === 'MEMBER_REMOVAL' &&
				closed.targetMemberId
			) {
				await tx.groupMember.update({
					where: { id: closed.targetMemberId },
					data: { status: 'LEFT', leftAt: new Date() },
				});
			}

			return closed;
		});

		await this.audit.log({
			eventType: 'MEMBER_REMOVAL_VOTE_DECIDED',
			groupId: vote.groupId,
			payload: { voteId: vote.id, status: newStatus },
		});

		if (newStatus === 'APPROVED') {
			await this.audit.log({
				eventType: 'MEMBER_REMOVED',
				groupId: vote.groupId,
				payload: {
					voteId: vote.id,
					targetMemberId: vote.targetMemberId,
				},
			});
		}

		return updated;
	}
}
