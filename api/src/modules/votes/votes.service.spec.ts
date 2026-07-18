import { PrismaService } from '$lib/database/prisma.service';
import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import type { VoteResolver } from './vote-resolver.interface';
import { VoteResolverRegistry } from './vote-resolver.registry';
import { VotesService } from './votes.service';

function makePrisma() {
	const prisma = {
		groupMember: { findFirst: jest.fn() },
		vote: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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
		groupMember: { findFirst: jest.Mock };
		vote: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
		voteResponse: {
			findUnique: jest.Mock;
			create: jest.Mock;
			findMany: jest.Mock;
		};
		$transaction: jest.Mock;
	};
}

function makeResolver(subjectType: 'MEMBER_REMOVAL' | 'PROJECT') {
	return {
		subjectType,
		onResolved: jest.fn().mockResolvedValue(undefined),
		afterResolved: jest.fn().mockResolvedValue(undefined),
	} as unknown as VoteResolver & {
		onResolved: jest.Mock;
		afterResolved: jest.Mock;
	};
}

describe('VotesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let registry: VoteResolverRegistry;
	let service: VotesService;

	beforeEach(() => {
		prisma = makePrisma();
		registry = new VoteResolverRegistry();
		service = new VotesService(prisma, registry);
	});

	describe('open', () => {
		it('creates a vote with a scheduledCloseAt durationHours from now', async () => {
			const vote = { id: 'vote-1' };
			prisma.vote.create.mockResolvedValue(vote);

			const result = await service.open({
				subjectType: 'PROJECT',
				groupId: 'group-1',
				projectId: 'project-1',
				approvalThreshold: 50,
				minQuorum: 2,
				durationHours: 24,
			});

			expect(result).toBe(vote);
			expect(prisma.vote.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					subjectType: 'PROJECT',
					groupId: 'group-1',
					projectId: 'project-1',
					approvalThreshold: 50,
					minQuorum: 2,
					durationHours: 24,
					scheduledCloseAt: expect.any(Date),
				}),
			});
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

		it('records a FOR/AGAINST/ABSTAIN response from an eligible member', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'voter-1',
				userId: 'user-2',
			});
			prisma.voteResponse.findUnique.mockResolvedValue(null);
			const response = { id: 'response-1', choice: 'FOR' };
			prisma.voteResponse.create.mockResolvedValue(response);

			const result = await service.respond('vote-1', 'user-2', 'FOR' as never);

			expect(result).toBe(response);
			expect(prisma.voteResponse.create).toHaveBeenCalledWith({
				data: { voteId: 'vote-1', memberId: 'voter-1', choice: 'FOR' },
			});
		});

		it('rejects the targeted member responding to their own removal vote with 403', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'target-1',
				userId: 'user-3',
			});

			await expect(
				service.respond('vote-1', 'user-3', 'AGAINST' as never),
			).rejects.toThrow(ForbiddenException);
			expect(prisma.voteResponse.create).not.toHaveBeenCalled();
		});

		it('rejects a second response from the same member with 409', async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'voter-1',
				userId: 'user-2',
			});
			prisma.voteResponse.findUnique.mockResolvedValue({
				id: 'existing-response',
			});

			await expect(
				service.respond('vote-1', 'user-2', 'FOR' as never),
			).rejects.toThrow(ConflictException);
		});

		it('rejects responding to a vote that already closed with 409', async () => {
			prisma.vote.findUnique.mockResolvedValue({
				...openVote,
				status: 'APPROVED',
			});
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'voter-1',
				userId: 'user-2',
			});

			await expect(
				service.respond('vote-1', 'user-2', 'FOR' as never),
			).rejects.toThrow(ConflictException);
		});

		it("rejects a non-member of the vote's group with 403", async () => {
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue(null);

			await expect(
				service.respond('vote-1', 'outsider', 'FOR' as never),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('get / lazy vote resolution', () => {
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
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'member-1',
				userId: 'user-1',
			});
			prisma.voteResponse.findMany.mockResolvedValue([]);

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).not.toHaveBeenCalled();
		});

		it('flips an OPEN vote to APPROVED and dispatches to the registered resolver', async () => {
			const resolver = makeResolver('MEMBER_REMOVAL');
			registry.register(resolver);

			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({
				id: 'member-1',
				userId: 'user-1',
			});
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([{ choice: 'FOR' }, { choice: 'FOR' }])
				.mockResolvedValueOnce([{ choice: 'FOR' }, { choice: 'FOR' }]);
			prisma.vote.update.mockResolvedValue({
				...pastDueVote(),
				status: 'APPROVED',
			});

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'APPROVED', actualCloseAt: expect.any(Date) },
			});
			expect(resolver.onResolved).toHaveBeenCalledWith(
				prisma,
				expect.objectContaining({ status: 'APPROVED' }),
				'APPROVED',
			);
			expect(resolver.afterResolved).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'APPROVED' }),
				'APPROVED',
				undefined,
			);
		});

		it('flips to INVALID when quorum is not met', async () => {
			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({
				id: 'member-1',
				userId: 'user-1',
			});
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([{ choice: 'FOR' }])
				.mockResolvedValueOnce([{ choice: 'FOR' }]);
			prisma.vote.update.mockResolvedValue({
				...pastDueVote(),
				status: 'INVALID',
			});

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'INVALID', actualCloseAt: expect.any(Date) },
			});
		});

		it('flips to REJECTED when quorum is met but the FOR ratio misses the threshold', async () => {
			prisma.vote.findUnique.mockResolvedValue(pastDueVote());
			prisma.groupMember.findFirst.mockResolvedValueOnce({
				id: 'member-1',
				userId: 'user-1',
			});
			prisma.voteResponse.findMany
				.mockResolvedValueOnce([
					{ choice: 'FOR' },
					{ choice: 'AGAINST' },
					{ choice: 'AGAINST' },
				])
				.mockResolvedValueOnce([
					{ choice: 'FOR' },
					{ choice: 'AGAINST' },
					{ choice: 'AGAINST' },
				]);
			prisma.vote.update.mockResolvedValue({
				...pastDueVote(),
				status: 'REJECTED',
			});

			await service.get('vote-1', 'user-1');

			expect(prisma.vote.update).toHaveBeenCalledWith({
				where: { id: 'vote-1' },
				data: { status: 'REJECTED', actualCloseAt: expect.any(Date) },
			});
		});

		it('returns a FOR/AGAINST/ABSTAIN tally alongside the vote', async () => {
			const openVote = {
				...pastDueVote(),
				scheduledCloseAt: new Date(Date.now() + 60 * 60 * 1000),
			};
			prisma.vote.findUnique.mockResolvedValue(openVote);
			prisma.groupMember.findFirst.mockResolvedValue({
				id: 'member-1',
				userId: 'user-1',
			});
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
