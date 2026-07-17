import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { VotesService } from './votes.service';

function makePrisma() {
	const prisma = {
		groupMember: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn() },
		vote: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
		voteResponse: {
			findUnique: jest.fn(),
			create: jest.fn(),
			findMany: jest.fn(),
		},
		$transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & {
		groupMember: { findFirst: jest.Mock; count: jest.Mock; update: jest.Mock };
		vote: {
			findFirst: jest.Mock;
			create: jest.Mock;
			findUnique: jest.Mock;
			update: jest.Mock;
		};
		voteResponse: {
			findUnique: jest.Mock;
			create: jest.Mock;
			findMany: jest.Mock;
		};
		$transaction: jest.Mock;
	};
}

function makeAudit() {
	return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService & {
		log: jest.Mock;
	};
}

const proposer = { id: 'proposer-1', groupId: 'group-1', userId: 'user-1' };

describe('VotesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: VotesService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new VotesService(prisma, audit);
	});

	describe('proposeRemoval', () => {
		it('rejects a member proposing removal against themselves with 403 (AC-9)', async () => {
			await expect(
				service.proposeRemoval(
					'group-1',
					proposer.id,
					proposer as never,
					{ approvalThreshold: 50, minQuorum: 2, durationHours: 24 },
				),
			).rejects.toThrow(ForbiddenException);
		});

		it('rejects when the target is not an active member of the group with 404 (AC-9)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue(null);

			await expect(
				service.proposeRemoval(
					'group-1',
					'target-1',
					proposer as never,
					{ approvalThreshold: 50, minQuorum: 2, durationHours: 24 },
				),
			).rejects.toThrow(NotFoundException);
		});

		it('rejects when fewer than 2 other active members exist besides the target with 422 (AC-9)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
			prisma.groupMember.count.mockResolvedValue(2); // proposer + target only

			await expect(
				service.proposeRemoval(
					'group-1',
					'target-1',
					proposer as never,
					{ approvalThreshold: 50, minQuorum: 1, durationHours: 24 },
				),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects a duplicate open removal vote against the same target with 409 (AC-9)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
			prisma.groupMember.count.mockResolvedValue(4); // proposer + target + 2 others
			prisma.vote.findFirst.mockResolvedValue({ id: 'existing-vote' });

			await expect(
				service.proposeRemoval(
					'group-1',
					'target-1',
					proposer as never,
					{ approvalThreshold: 50, minQuorum: 2, durationHours: 24 },
				),
			).rejects.toThrow(ConflictException);
		});

		it('rejects a minQuorum below the bare-majority floor of other active members with 422 (AC-9)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
			prisma.groupMember.count.mockResolvedValue(4); // 3 others besides target, floor = 2
			prisma.vote.findFirst.mockResolvedValue(null);

			await expect(
				service.proposeRemoval(
					'group-1',
					'target-1',
					proposer as never,
					{ approvalThreshold: 50, minQuorum: 1, durationHours: 24 },
				),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects an approvalThreshold below the 50% floor with 422 (AC-9)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
			prisma.groupMember.count.mockResolvedValue(4);
			prisma.vote.findFirst.mockResolvedValue(null);

			await expect(
				service.proposeRemoval(
					'group-1',
					'target-1',
					proposer as never,
					{ approvalThreshold: 30, minQuorum: 2, durationHours: 24 },
				),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('creates a MEMBER_REMOVAL vote at or above the floor (AC-9, AC-14)', async () => {
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1' });
			prisma.groupMember.count.mockResolvedValue(4); // 3 others, floor = 2
			prisma.vote.findFirst.mockResolvedValue(null);
			const vote = { id: 'vote-1', status: 'OPEN' };
			prisma.vote.create.mockResolvedValue(vote);

			const result = await service.proposeRemoval(
				'group-1',
				'target-1',
				proposer as never,
				{ approvalThreshold: 50, minQuorum: 2, durationHours: 24 },
			);

			expect(result).toBe(vote);
			expect(prisma.vote.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					subjectType: 'MEMBER_REMOVAL',
					groupId: 'group-1',
					targetMemberId: 'target-1',
					approvalThreshold: 50,
					minQuorum: 2,
					durationHours: 24,
				}),
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVAL_VOTE_PROPOSED' }),
			);
		});
	});

	describe('respond', () => {
		const openVote = {
			id: 'vote-1',
			groupId: 'group-1',
			status: 'OPEN',
			scheduledCloseAt: new Date(Date.now() + 60 * 60 * 1000),
			targetMemberId: 'target-1',
		};

		it('records a FOR/AGAINST/ABSTAIN response from an eligible member (AC-10)', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'voter-1', userId: 'user-2' });
			prisma.voteResponse.findUnique.mockResolvedValue(null);
			const response = { id: 'response-1', choice: 'FOR' };
			prisma.voteResponse.create.mockResolvedValue(response);

			const result = await service.respond('vote-1', 'user-2', 'FOR' as never);

			expect(result).toBe(response);
			expect(prisma.voteResponse.create).toHaveBeenCalledWith({
				data: { voteId: 'vote-1', memberId: 'voter-1', choice: 'FOR' },
			});
		});

		it('rejects the targeted member responding to their own removal vote with 403 (AC-10)', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'target-1', userId: 'user-3' });

			await expect(
				service.respond('vote-1', 'user-3', 'AGAINST' as never),
			).rejects.toThrow(ForbiddenException);
			expect(prisma.voteResponse.create).not.toHaveBeenCalled();
		});

		it('rejects a second response from the same member with 409 (AC-10)', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'voter-1', userId: 'user-2' });
			prisma.voteResponse.findUnique.mockResolvedValue({ id: 'existing-response' });

			await expect(
				service.respond('vote-1', 'user-2', 'FOR' as never),
			).rejects.toThrow(ConflictException);
		});

		it('rejects responding to a vote that already closed with 409', async () => {
			prisma.vote.findUnique.mockResolvedValue({ ...openVote, status: 'APPROVED' });
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'voter-1', userId: 'user-2' });

			await expect(
				service.respond('vote-1', 'user-2', 'FOR' as never),
			).rejects.toThrow(ConflictException);
		});

		it('rejects a non-member of the vote\'s group with 403', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue(null);

			await expect(
				service.respond('vote-1', 'outsider', 'FOR' as never),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('get / lazy vote evaluation (AC-11)', () => {
		function pastDueVote(overrides: Record<string, unknown> = {}) {
			return {
				id: 'vote-1',
				groupId: 'group-1',
				status: 'OPEN',
				subjectType: 'MEMBER_REMOVAL',
				targetMemberId: 'target-1',
				minQuorum: 2,
				approvalThreshold: 50,
				scheduledCloseAt: new Date('2000-01-01'),
				...overrides,
			};
		}

		it('does not evaluate a vote whose scheduledCloseAt has not passed yet', async () => {
			const openVote = {
				...pastDueVote(),
				scheduledCloseAt: new Date(Date.now() + 60 * 60 * 1000),
			};
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'member-1', userId: 'user-1' });
			prisma.voteResponse.findMany.mockResolvedValue([]);

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).not.toHaveBeenCalled();
		});

		it('flips an OPEN vote to APPROVED and the target to LEFT once quorum and threshold are met (AC-11)', async () => {
			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({ id: 'member-1', userId: 'user-1' }); // getActiveMember
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([
					{ choice: 'FOR' },
					{ choice: 'FOR' },
				]) // closeVote's own tally lookup
				.mockResolvedValueOnce([
					{ choice: 'FOR' },
					{ choice: 'FOR' },
				]); // get()'s response listing after close
			prisma.vote.update.mockResolvedValue({
				...pastDueVote(),
				status: 'APPROVED',
			});

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'APPROVED', actualCloseAt: expect.any(Date) },
			});
			expect(prisma.groupMember.update).toHaveBeenCalledWith({
				where: { id: 'target-1' },
				data: { status: 'LEFT', leftAt: expect.any(Date) },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVAL_VOTE_DECIDED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVED' }),
			);
		});

		it('flips to INVALID (and does not remove the target) when quorum is not met', async () => {
			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({ id: 'member-1', userId: 'user-1' });
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([{ choice: 'FOR' }]) // only 1 response, quorum is 2
				.mockResolvedValueOnce([{ choice: 'FOR' }]);
			prisma.vote.update.mockResolvedValue({ ...pastDueVote(), status: 'INVALID' });

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'INVALID', actualCloseAt: expect.any(Date) },
			});
			expect(prisma.groupMember.update).not.toHaveBeenCalled();
		});

		it('flips to REJECTED (and does not remove the target) when quorum is met but the FOR ratio misses the threshold', async () => {
			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({ id: 'member-1', userId: 'user-1' });
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([{ choice: 'FOR' }, { choice: 'AGAINST' }, { choice: 'AGAINST' }])
				.mockResolvedValueOnce([{ choice: 'FOR' }, { choice: 'AGAINST' }, { choice: 'AGAINST' }]);
			prisma.vote.update.mockResolvedValue({ ...pastDueVote(), status: 'REJECTED' });

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'REJECTED', actualCloseAt: expect.any(Date) },
			});
			expect(prisma.groupMember.update).not.toHaveBeenCalled();
		});

		it('returns a FOR/AGAINST/ABSTAIN tally alongside the vote', async () => {
			const openVote = {
				...pastDueVote(),
				scheduledCloseAt: new Date(Date.now() + 60 * 60 * 1000),
			};
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({ id: 'member-1', userId: 'user-1' });
			prisma.voteResponse.findMany.mockResolvedValue([
				{ choice: 'FOR' },
				{ choice: 'FOR' },
				{ choice: 'AGAINST' },
				{ choice: 'ABSTAIN' },
			]);

			const result = await service.get('vote-1', 'user-1');

			expect(result.tally).toEqual({ FOR: 2, AGAINST: 1, ABSTAIN: 1 });
		});

		it('rejects fetching a vote for a group the caller is not an active member of with 403', async () => {
			const openVote = {
				...pastDueVote(),
				scheduledCloseAt: new Date(Date.now() + 60 * 60 * 1000),
			};
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue(null);

			await expect(service.get('vote-1', 'outsider')).rejects.toThrow(
				ForbiddenException,
			);
		});

		it('rejects an unknown vote id with 404', async () => {
			prisma.vote.findUnique.mockResolvedValue(null);

			await expect(service.get('nope', 'user-1')).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
