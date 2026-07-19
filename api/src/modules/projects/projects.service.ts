import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import { VoteConfigService } from '$/votes/vote-config.service';
import { VotesService } from '$/votes/votes.service';
import {
	Prisma,
	type GroupMember,
	type Project,
	type Vote,
} from '$prisma/client';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { CreateProjectFlowRuleDto } from './dto/create-project-flow-rule.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectActivationService } from './project-activation.service';

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		private readonly votes: VotesService,
		private readonly voteConfig: VoteConfigService,
		private readonly activation: ProjectActivationService,
	) {}

	async submit(
		groupId: string,
		member: GroupMember,
		dto: CreateProjectDto,
	): Promise<Project & { vote: Vote }> {
		const sourceVault = await this.prisma.vault.findFirst({
			where: { id: dto.sourceVaultId, groupId, type: 'GROUP' },
		});

		if (!sourceVault) {
			throw new UnprocessableEntityException(
				'sourceVaultId must reference a GROUP vault in this group',
			);
		}

		if (dto.payoutVaultName && !dto.vaults.includes(dto.payoutVaultName)) {
			throw new UnprocessableEntityException(
				'payoutVaultName must be one of the submitted project vaults',
			);
		}

		for (const rule of dto.flowRules) {
			this.assertDestinationsValid(rule, dto.vaults);
		}

		const voteConfig = await this.voteConfig.get(groupId);

		const { project, vote } = await this.prisma.$transaction(
			async (tx) => {
				const created = await tx.project.create({
					data: {
						groupId,
						title: dto.title,
						description: dto.description,
						proposedById: member.id,
						requestedBudget: dto.requestedBudget,
						sourceVaultId: sourceVault.id,
					},
				});

				const vaultNameToId = new Map<string, string>();
				for (const name of dto.vaults) {
					const vault = await tx.vault.create({
						data: {
							groupId,
							type: 'PROJECT',
							name,
							projectId: created.id,
						},
					});
					vaultNameToId.set(name, vault.id);
				}

				const withPayoutVault = dto.payoutVaultName
					? await tx.project.update({
							where: { id: created.id },
							data: {
								payoutVaultId: vaultNameToId.get(
									dto.payoutVaultName,
								),
							},
						})
					: created;

				for (const rule of dto.flowRules) {
					await tx.flowRule.create({
						data: {
							groupId,
							name: rule.name,
							sourceType: rule.sourceType,
							sourceRefId: created.id,
							destinations: {
								create: rule.destinations.map((d, index) => ({
									destinationType: d.destinationType,
									vaultId:
										d.destinationType === 'VAULT'
											? vaultNameToId.get(d.vaultName!)
											: null,
									percentage: d.percentage,
									sortOrder: index,
								})),
							},
						},
					});
				}

				const openedVote = await this.votes.open(
					{
						subjectType: 'PROJECT',
						groupId,
						projectId: created.id,
						approvalThreshold: voteConfig.approvalThreshold,
						minQuorum: voteConfig.minQuorum,
						durationHours: voteConfig.durationHours,
					},
					tx,
				);

				return { project: withPayoutVault, vote: openedVote };
			},
			{ timeout: 15_000 },
		);

		await this.audit.log({
			eventType: 'PROJECT_SUBMITTED',
			groupId,
			actorId: member.userId,
			payload: { projectId: project.id, voteId: vote.id },
		});

		await this.audit.log({
			eventType: 'PROJECT_VOTE_OPENED',
			groupId,
			actorId: member.userId,
			payload: { projectId: project.id, voteId: vote.id },
		});

		return { ...project, vote };
	}

	async list(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.project.findMany({
				where: { groupId },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.project.count({ where: { groupId } }),
		]);

		return { data, page, limit, total };
	}

	async get(groupId: string, projectId: string) {
		const project = await this.loadProject(groupId, projectId);
		const retried = await this.activation.retryIfApproved(project);

		const [projectVaults, flowRules, votes] = await Promise.all([
			this.prisma.vault.findMany({
				where: { projectId: retried.id },
				orderBy: { createdAt: 'asc' },
			}),
			this.prisma.flowRule.findMany({
				where: { groupId, sourceRefId: retried.id },
				include: { destinations: { orderBy: { sortOrder: 'asc' } } },
				orderBy: { createdAt: 'asc' },
			}),
			this.prisma.vote.findMany({
				where: { groupId, projectId: retried.id },
				orderBy: { openedAt: 'desc' },
			}),
		]);

		return { ...retried, projectVaults, flowRules, votes };
	}

	/**
	 * AC-2: after an INVALID (quorum not met) vote, any active member may
	 * open a fresh vote session for the same still-PENDING project.
	 */
	async reopenVote(
		groupId: string,
		projectId: string,
		member: GroupMember,
	): Promise<Vote> {
		const project = await this.loadProject(groupId, projectId);

		if (project.status !== 'PENDING') {
			throw new UnprocessableEntityException(
				'A new vote session can only be opened for a PENDING project',
			);
		}

		const openExisting = await this.prisma.vote.findFirst({
			where: {
				groupId,
				projectId,
				subjectType: 'PROJECT',
				status: 'OPEN',
			},
		});

		if (openExisting) {
			throw new ConflictException(
				'An open vote already exists for this project',
			);
		}

		const voteConfig = await this.voteConfig.get(groupId);

		const vote = await this.votes.open({
			subjectType: 'PROJECT',
			groupId,
			projectId,
			approvalThreshold: voteConfig.approvalThreshold,
			minQuorum: voteConfig.minQuorum,
			durationHours: voteConfig.durationHours,
		});

		await this.audit.log({
			eventType: 'PROJECT_VOTE_REOPENED',
			groupId,
			actorId: member.userId,
			payload: { projectId, voteId: vote.id },
		});

		return vote;
	}

	async loadProject(groupId: string, projectId: string): Promise<Project> {
		const project = await this.prisma.project.findFirst({
			where: { id: projectId, groupId },
		});

		if (!project) {
			throw new NotFoundException('Project not found');
		}

		return project;
	}

	private assertDestinationsValid(
		rule: CreateProjectFlowRuleDto,
		submittedVaultNames: string[],
	): void {
		const sum = rule.destinations.reduce(
			(acc, d) => acc.plus(new Prisma.Decimal(d.percentage)),
			new Prisma.Decimal(0),
		);

		if (!sum.equals(100)) {
			throw new UnprocessableEntityException(
				`Destination percentages for the "${rule.sourceType}" flow rule must sum to exactly 100`,
			);
		}

		for (const d of rule.destinations) {
			if (d.destinationType === 'VAULT') {
				if (!d.vaultName) {
					throw new UnprocessableEntityException(
						'vaultName is required for a VAULT destination',
					);
				}

				if (!submittedVaultNames.includes(d.vaultName)) {
					throw new UnprocessableEntityException(
						`vaultName "${d.vaultName}" must be one of this submission's own project vaults`,
					);
				}
			}
		}
	}
}
