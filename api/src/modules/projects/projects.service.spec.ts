import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { VoteConfigService } from '$/votes/vote-config.service';
import { VotesService } from '$/votes/votes.service';
import {
	ConflictException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ProjectActivationService } from './project-activation.service';
import { ProjectsService } from './projects.service';

function makePrisma() {
	const prisma = {
		vault: { findFirst: jest.fn(), findMany: jest.fn() },
		project: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
		flowRule: { findMany: jest.fn() },
		vote: { findFirst: jest.fn(), findMany: jest.fn() },
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(tx),
		),
	};
	const tx = {
		project: {
			create: jest.fn(),
			update: jest.fn(),
		},
		vault: { create: jest.fn() },
		flowRule: { create: jest.fn() },
	};

	return {
		prisma: prisma as unknown as PrismaService & {
			vault: { findFirst: jest.Mock; findMany: jest.Mock };
			project: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
			flowRule: { findMany: jest.Mock };
			vote: { findFirst: jest.Mock; findMany: jest.Mock };
			$transaction: jest.Mock;
		},
		tx,
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeVotes() {
	return { open: jest.fn() } as unknown as VotesService & { open: jest.Mock };
}

function makeVoteConfig() {
	return {
		get: jest.fn().mockResolvedValue({
			approvalThreshold: 50,
			minQuorum: 1,
			durationHours: 72,
		}),
	} as unknown as VoteConfigService & { get: jest.Mock };
}

function makeActivation(returnProject?: unknown) {
	return {
		retryIfApproved: jest.fn().mockResolvedValue(returnProject),
	} as unknown as ProjectActivationService & { retryIfApproved: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };
const groupVault = { id: 'source-vault-1', groupId: 'group-1', type: 'GROUP' };

const validFlowRules = [
	{
		sourceType: 'PROJECT_REVENUE' as const,
		destinations: [
			{ destinationType: 'VAULT' as const, vaultName: 'Main', percentage: 100 },
		],
	},
];

describe('ProjectsService', () => {
	describe('submit', () => {
		it('rejects a sourceVaultId that is not a GROUP vault in this group (AC-1)', async () => {
			const { prisma } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(null);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.submit('group-1', member as never, {
					title: 'Garden',
					requestedBudget: 100,
					sourceVaultId: 'not-a-group-vault',
					vaults: ['Main'],
					flowRules: validFlowRules,
				} as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects a payoutVaultName not among the submitted vaults (AC-1)', async () => {
			const { prisma } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.submit('group-1', member as never, {
					title: 'Garden',
					requestedBudget: 100,
					sourceVaultId: 'source-vault-1',
					vaults: ['Main'],
					payoutVaultName: 'Nope',
					flowRules: validFlowRules,
				} as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects a flow rule whose destination percentages do not sum to 100 (AC-1)', async () => {
			const { prisma } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.submit('group-1', member as never, {
					title: 'Garden',
					requestedBudget: 100,
					sourceVaultId: 'source-vault-1',
					vaults: ['Main'],
					flowRules: [
						{
							sourceType: 'PROJECT_REVENUE',
							destinations: [
								{ destinationType: 'VAULT', vaultName: 'Main', percentage: 60 },
							],
						},
					],
				} as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects a VAULT destination whose vaultName is not one of the submitted vaults (AC-1)', async () => {
			const { prisma } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.submit('group-1', member as never, {
					title: 'Garden',
					requestedBudget: 100,
					sourceVaultId: 'source-vault-1',
					vaults: ['Main'],
					flowRules: [
						{
							sourceType: 'PROJECT_REVENUE',
							destinations: [
								{ destinationType: 'VAULT', vaultName: 'Other', percentage: 100 },
							],
						},
					],
				} as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('creates the project, its vaults, its flow rules, and opens a PROJECT vote using the group vote-config, all inside one transaction (AC-1)', async () => {
			const { prisma, tx } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			const created = { id: 'project-1', status: 'PENDING' };
			tx.project.create.mockResolvedValue(created);
			tx.vault.create.mockResolvedValue({ id: 'main-vault-1' });
			const vote = { id: 'vote-1' };
			const votes = makeVotes();
			votes.open.mockResolvedValue(vote);
			const voteConfig = makeVoteConfig();
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				votes,
				voteConfig,
				makeActivation(),
			);

			const result = await service.submit('group-1', member as never, {
				title: 'Garden',
				requestedBudget: 100,
				sourceVaultId: 'source-vault-1',
				vaults: ['Main'],
				flowRules: validFlowRules,
			} as never);

			expect(result).toEqual({ ...created, vote });
			expect(tx.project.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					groupId: 'group-1',
					title: 'Garden',
					proposedById: 'member-1',
					requestedBudget: 100,
					sourceVaultId: 'source-vault-1',
				}),
			});
			expect(votes.open).toHaveBeenCalledWith(
				expect.objectContaining({
					subjectType: 'PROJECT',
					groupId: 'group-1',
					projectId: 'project-1',
					approvalThreshold: 50,
					minQuorum: 1,
					durationHours: 72,
				}),
				tx,
			);
			expect(tx.project.update).not.toHaveBeenCalled();
		});

		it("persists payoutVaultId and returns the updated row, not the pre-update snapshot (regression: /check verify 2026-07-18 found the response showing payoutVaultId: null)", async () => {
			const { prisma, tx } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			const created = { id: 'project-1', status: 'PENDING', payoutVaultId: null };
			tx.project.create.mockResolvedValue(created);
			tx.vault.create.mockResolvedValue({ id: 'main-vault-1' });
			const withPayout = { ...created, payoutVaultId: 'main-vault-1' };
			tx.project.update.mockResolvedValue(withPayout);
			const votes = makeVotes();
			votes.open.mockResolvedValue({ id: 'vote-1' });
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				votes,
				makeVoteConfig(),
				makeActivation(),
			);

			const result = await service.submit('group-1', member as never, {
				title: 'Garden',
				requestedBudget: 100,
				sourceVaultId: 'source-vault-1',
				vaults: ['Main'],
				payoutVaultName: 'Main',
				flowRules: validFlowRules,
			} as never);

			expect(tx.project.update).toHaveBeenCalledWith({
				where: { id: 'project-1' },
				data: { payoutVaultId: 'main-vault-1' },
			});
			expect(result.payoutVaultId).toBe('main-vault-1');
		});

		it('logs PROJECT_SUBMITTED and PROJECT_VOTE_OPENED after the transaction commits (AC-1, AC-10)', async () => {
			const { prisma, tx } = makePrisma();
			prisma.vault.findFirst.mockResolvedValue(groupVault);
			tx.project.create.mockResolvedValue({ id: 'project-1' });
			tx.vault.create.mockResolvedValue({ id: 'main-vault-1' });
			const votes = makeVotes();
			votes.open.mockResolvedValue({ id: 'vote-1' });
			const audit = makeAudit();
			const service = new ProjectsService(
				prisma,
				audit,
				votes,
				makeVoteConfig(),
				makeActivation(),
			);

			await service.submit('group-1', member as never, {
				title: 'Garden',
				requestedBudget: 100,
				sourceVaultId: 'source-vault-1',
				vaults: ['Main'],
				flowRules: validFlowRules,
			} as never);

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_SUBMITTED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_VOTE_OPENED' }),
			);
		});
	});

	describe('list', () => {
		it('returns a paginated list of the group\'s projects (AC-9)', async () => {
			const { prisma } = makePrisma();
			prisma.project.findMany.mockResolvedValue([{ id: 'project-1' }]);
			prisma.project.count.mockResolvedValue(1);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			const result = await service.list('group-1', {} as never);

			expect(result).toEqual({
				data: [{ id: 'project-1' }],
				page: 1,
				limit: 20,
				total: 1,
			});
		});
	});

	describe('get', () => {
		it('throws NotFoundException for a project not in this group', async () => {
			const { prisma } = makePrisma();
			prisma.project.findFirst.mockResolvedValue(null);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(service.get('group-1', 'missing')).rejects.toThrow(
				NotFoundException,
			);
		});

		it('retries activation via ProjectActivationService and returns vaults/flowRules/votes alongside the (possibly retried) project (AC-4, AC-9)', async () => {
			const { prisma } = makePrisma();
			const loaded = { id: 'project-1', groupId: 'group-1', status: 'APPROVED' };
			const retried = { ...loaded, status: 'ACTIVE' };
			prisma.project.findFirst.mockResolvedValue(loaded);
			prisma.vault.findMany.mockResolvedValue([{ id: 'vault-1' }]);
			prisma.flowRule.findMany.mockResolvedValue([{ id: 'rule-1' }]);
			prisma.vote.findMany.mockResolvedValue([{ id: 'vote-1' }]);
			const activation = makeActivation(retried);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				activation,
			);

			const result = await service.get('group-1', 'project-1');

			expect(activation.retryIfApproved).toHaveBeenCalledWith(loaded);
			expect(result).toEqual({
				...retried,
				projectVaults: [{ id: 'vault-1' }],
				flowRules: [{ id: 'rule-1' }],
				votes: [{ id: 'vote-1' }],
			});
		});
	});

	describe('reopenVote', () => {
		it('rejects reopening a vote for a project that is not PENDING (AC-2)', async () => {
			const { prisma } = makePrisma();
			prisma.project.findFirst.mockResolvedValue({
				id: 'project-1',
				status: 'REJECTED',
			});
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.reopenVote('group-1', 'project-1', member as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects reopening when an OPEN vote already exists for the project (AC-2)', async () => {
			const { prisma } = makePrisma();
			prisma.project.findFirst.mockResolvedValue({
				id: 'project-1',
				status: 'PENDING',
			});
			prisma.vote.findFirst.mockResolvedValue({ id: 'existing-vote' });
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.reopenVote('group-1', 'project-1', member as never),
			).rejects.toThrow(ConflictException);
		});

		it('opens a fresh vote session for a still-PENDING project using the current vote-config (AC-2)', async () => {
			const { prisma } = makePrisma();
			prisma.project.findFirst.mockResolvedValue({
				id: 'project-1',
				status: 'PENDING',
			});
			prisma.vote.findFirst.mockResolvedValue(null);
			const votes = makeVotes();
			const newVote = { id: 'vote-2' };
			votes.open.mockResolvedValue(newVote);
			const audit = makeAudit();
			const service = new ProjectsService(
				prisma,
				audit,
				votes,
				makeVoteConfig(),
				makeActivation(),
			);

			const result = await service.reopenVote(
				'group-1',
				'project-1',
				member as never,
			);

			expect(result).toBe(newVote);
			expect(votes.open).toHaveBeenCalledWith({
				subjectType: 'PROJECT',
				groupId: 'group-1',
				projectId: 'project-1',
				approvalThreshold: 50,
				minQuorum: 1,
				durationHours: 72,
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_VOTE_REOPENED' }),
			);
		});
	});

	describe('loadProject', () => {
		it('throws NotFoundException when the project does not belong to this group', async () => {
			const { prisma } = makePrisma();
			prisma.project.findFirst.mockResolvedValue(null);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			await expect(
				service.loadProject('group-1', 'missing'),
			).rejects.toThrow(NotFoundException);
		});

		it('returns the project scoped to groupId + projectId', async () => {
			const { prisma } = makePrisma();
			const project = { id: 'project-1', groupId: 'group-1' };
			prisma.project.findFirst.mockResolvedValue(project);
			const service = new ProjectsService(
				prisma,
				makeAudit(),
				makeVotes(),
				makeVoteConfig(),
				makeActivation(),
			);

			const result = await service.loadProject('group-1', 'project-1');

			expect(result).toBe(project);
			expect(prisma.project.findFirst).toHaveBeenCalledWith({
				where: { id: 'project-1', groupId: 'group-1' },
			});
		});
	});
});
