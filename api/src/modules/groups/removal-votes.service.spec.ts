import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { VotesService } from '$/votes/votes.service';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { RemovalVotesService } from './removal-votes.service';

function makePrisma() {
	return {
		groupMember: { findFirst: jest.fn(), count: jest.fn() },
		vote: { findFirst: jest.fn(), findMany: jest.fn() },
		voteResponse: { findMany: jest.fn() },
	} as unknown as PrismaService & {
		groupMember: { findFirst: jest.Mock; count: jest.Mock };
		vote: { findFirst: jest.Mock; findMany: jest.Mock };
		voteResponse: { findMany: jest.Mock };
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeVotes() {
	return {
		open: jest.fn(),
		resolveVote: jest.fn(),
	} as unknown as VotesService & {
		open: jest.Mock;
		resolveVote: jest.Mock;
	};
}

const proposer = { id: 'proposer-1', groupId: 'group-1', userId: 'user-1' };

describe('RemovalVotesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let votes: ReturnType<typeof makeVotes>;
	let service: RemovalVotesService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		votes = makeVotes();
		service = new RemovalVotesService(prisma, audit, votes);
	});

	it('rejects a member proposing removal against themselves with 403 (AC-9)', async () => {
		await expect(
			service.proposeRemoval('group-1', proposer.id, proposer as never, {
				approvalThreshold: 50,
				minQuorum: 2,
				durationHours: 24,
			}),
		).rejects.toThrow(ForbiddenException);
	});

	it('rejects when the target is not an active member of the group with 404 (AC-9)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue(null);

		await expect(
			service.proposeRemoval('group-1', 'target-1', proposer as never, {
				approvalThreshold: 50,
				minQuorum: 2,
				durationHours: 24,
			}),
		).rejects.toThrow(NotFoundException);
	});

	it('rejects when fewer than 2 other active members exist besides the target with 422 (AC-9)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
		prisma.groupMember.count.mockResolvedValue(2);

		await expect(
			service.proposeRemoval('group-1', 'target-1', proposer as never, {
				approvalThreshold: 50,
				minQuorum: 1,
				durationHours: 24,
			}),
		).rejects.toThrow(UnprocessableEntityException);
	});

	it('rejects a duplicate open removal vote against the same target with 409 (AC-9)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
		prisma.groupMember.count.mockResolvedValue(4);
		prisma.vote.findFirst.mockResolvedValue({ id: 'existing-vote' });

		await expect(
			service.proposeRemoval('group-1', 'target-1', proposer as never, {
				approvalThreshold: 50,
				minQuorum: 2,
				durationHours: 24,
			}),
		).rejects.toThrow(ConflictException);
	});

	it('rejects a minQuorum below the bare-majority floor of other active members with 422 (AC-9)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
		prisma.groupMember.count.mockResolvedValue(4);
		prisma.vote.findFirst.mockResolvedValue(null);

		await expect(
			service.proposeRemoval('group-1', 'target-1', proposer as never, {
				approvalThreshold: 50,
				minQuorum: 1,
				durationHours: 24,
			}),
		).rejects.toThrow(UnprocessableEntityException);
	});

	it('rejects an approvalThreshold below the 50% floor with 422 (AC-9)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
		prisma.groupMember.count.mockResolvedValue(4);
		prisma.vote.findFirst.mockResolvedValue(null);

		await expect(
			service.proposeRemoval('group-1', 'target-1', proposer as never, {
				approvalThreshold: 30,
				minQuorum: 2,
				durationHours: 24,
			}),
		).rejects.toThrow(UnprocessableEntityException);
	});

	it('opens a MEMBER_REMOVAL vote at or above the floor (AC-9, AC-14)', async () => {
		prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
		prisma.groupMember.count.mockResolvedValue(4);
		prisma.vote.findFirst.mockResolvedValue(null);
		const vote = { id: 'vote-1', status: 'OPEN' };
		votes.open.mockResolvedValue(vote);

		const result = await service.proposeRemoval(
			'group-1',
			'target-1',
			proposer as never,
			{ approvalThreshold: 50, minQuorum: 2, durationHours: 24 },
		);

		expect(result).toBe(vote);
		expect(votes.open).toHaveBeenCalledWith({
			subjectType: 'MEMBER_REMOVAL',
			groupId: 'group-1',
			targetMemberId: 'target-1',
			approvalThreshold: 50,
			minQuorum: 2,
			durationHours: 24,
		});
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'MEMBER_REMOVAL_VOTE_PROPOSED',
			}),
		);
	});

	describe('listOpen (AC-15)', () => {
		it('resolves each candidate lazily, drops ones no longer open, and tallies the rest in one batch query', async () => {
			const stillOpen = { id: 'vote-1', status: 'OPEN' };
			const nowResolved = { id: 'vote-2', status: 'APPROVED' };
			prisma.vote.findMany.mockResolvedValue([
				{ id: 'vote-1', status: 'OPEN' },
				{ id: 'vote-2', status: 'OPEN' },
			]);
			votes.resolveVote.mockImplementation((id: string) =>
				Promise.resolve(id === 'vote-1' ? stillOpen : nowResolved),
			);
			prisma.voteResponse.findMany.mockResolvedValue([
				{ voteId: 'vote-1', memberId: 'm-1', choice: 'FOR' },
				{ voteId: 'vote-1', memberId: 'm-2', choice: 'AGAINST' },
			]);

			const result = await service.listOpen('group-1', {});

			expect(votes.resolveVote).toHaveBeenCalledWith('vote-1');
			expect(votes.resolveVote).toHaveBeenCalledWith('vote-2');
			expect(prisma.voteResponse.findMany).toHaveBeenCalledWith({
				where: { voteId: { in: ['vote-1'] } },
			});
			expect(result).toEqual({
				data: [
					{
						...stillOpen,
						responses: [
							{
								voteId: 'vote-1',
								memberId: 'm-1',
								choice: 'FOR',
							},
							{
								voteId: 'vote-1',
								memberId: 'm-2',
								choice: 'AGAINST',
							},
						],
						tally: { FOR: 1, AGAINST: 1, ABSTAIN: 0 },
					},
				],
				page: 1,
				limit: 20,
				total: 1,
			});
		});

		it('paginates the still-open list after resolution', async () => {
			prisma.vote.findMany.mockResolvedValue([
				{ id: 'vote-1', status: 'OPEN' },
				{ id: 'vote-2', status: 'OPEN' },
				{ id: 'vote-3', status: 'OPEN' },
			]);
			votes.resolveVote.mockImplementation((id: string) =>
				Promise.resolve({ id, status: 'OPEN' }),
			);
			prisma.voteResponse.findMany.mockResolvedValue([]);

			const result = await service.listOpen('group-1', {
				page: 2,
				limit: 2,
			});

			expect(result.total).toBe(3);
			expect(result.page).toBe(2);
			expect(result.limit).toBe(2);
			expect(result.data).toHaveLength(1);
			expect(result.data[0].id).toBe('vote-3');
		});
	});
});
