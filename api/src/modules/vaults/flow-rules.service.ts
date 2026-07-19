import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import {
	Prisma,
	type Contribution,
	type FlowRule,
	type GroupMember,
	type Transaction,
} from '$prisma/client';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { CreateFlowRuleDto } from './dto/create-flow-rule.dto';
import { FlowDestinationDto } from './dto/flow-destination.dto';
import { ReplaceFlowRuleDto } from './dto/replace-flow-rule.dto';

@Injectable()
export class FlowRulesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	async create(
		groupId: string,
		member: GroupMember,
		dto: CreateFlowRuleDto,
	): Promise<FlowRule> {
		this.assertDestinationsValid(dto.destinations);

		const rule = await this.prisma.flowRule.create({
			data: {
				groupId,
				name: dto.name,
				sourceType: dto.sourceType,
				destinations: {
					create: dto.destinations.map((d, index) => ({
						destinationType: d.destinationType,
						vaultId:
							d.destinationType === 'VAULT' ? d.vaultId : null,
						percentage: d.percentage,
						sortOrder: index,
					})),
				},
			},
			include: { destinations: true },
		});

		await this.audit.log({
			eventType: 'FLOW_RULE_CREATED',
			groupId,
			actorId: member.userId,
			payload: { flowRuleId: rule.id, sourceType: rule.sourceType },
		});

		return rule;
	}

	async list(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.flowRule.findMany({
				where: { groupId },
				include: { destinations: { orderBy: { sortOrder: 'asc' } } },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.flowRule.count({ where: { groupId } }),
		]);

		return { data, page, limit, total };
	}

	async replace(
		groupId: string,
		ruleId: string,
		member: GroupMember,
		dto: ReplaceFlowRuleDto,
	): Promise<FlowRule> {
		this.assertDestinationsValid(dto.destinations);

		const existing = await this.prisma.flowRule.findFirst({
			where: { id: ruleId, groupId },
		});

		if (!existing) {
			throw new NotFoundException('Flow rule not found');
		}

		const alreadyReplaced = await this.prisma.flowRule.findFirst({
			where: { replacesRuleId: ruleId },
		});

		if (!existing.active || alreadyReplaced) {
			throw new ConflictException(
				'This flow rule has already been replaced',
			);
		}

		const newRule = await this.prisma.$transaction(async (tx) => {
			await tx.flowRule.update({
				where: { id: ruleId },
				data: { active: false },
			});

			return tx.flowRule.create({
				data: {
					groupId,
					name: existing.name,
					sourceType: existing.sourceType,
					replacesRuleId: ruleId,
					destinations: {
						create: dto.destinations.map((d, index) => ({
							destinationType: d.destinationType,
							vaultId:
								d.destinationType === 'VAULT'
									? d.vaultId
									: null,
							percentage: d.percentage,
							sortOrder: index,
						})),
					},
				},
				include: { destinations: true },
			});
		});

		await this.audit.log({
			eventType: 'FLOW_RULE_REPLACED',
			groupId,
			actorId: member.userId,
			payload: { replacedRuleId: ruleId, newRuleId: newRule.id },
		});

		return newRule;
	}

	/**
	 * Applies every currently active CONTRIBUTION flow rule to a just
	 * recorded contribution, inside the caller's DB transaction. Returns
	 * every Transaction produced across every rule (AC-4, AC-5, AC-6).
	 */
	async applyContributionRules(
		tx: Prisma.TransactionClient,
		groupId: string,
		contribution: Contribution,
		createdById: string,
	): Promise<Transaction[]> {
		const rules = await tx.flowRule.findMany({
			where: { groupId, sourceType: 'CONTRIBUTION', active: true },
			include: { destinations: { orderBy: { sortOrder: 'asc' } } },
		});

		const created: Transaction[] = [];

		for (const rule of rules) {
			created.push(
				...(await this.applyRule(
					tx,
					groupId,
					rule.destinations,
					new Prisma.Decimal(contribution.amount),
					'CONTRIBUTION',
					contribution.id,
					createdById,
					'CREDIT',
				)),
			);
		}

		return created;
	}

	/**
	 * Applies every currently active PROJECT_REVENUE or PROJECT_EXPENSE flow
	 * rule for a project to a declared revenue/expense entry, inside the
	 * caller's DB transaction. Revenue credits its destinations (money
	 * entering); expense debits them (money leaving), guarded so a
	 * destination without enough balance fails the whole entry with a 422
	 * rather than going negative (spec 0004, AC-5/AC-6).
	 */
	async applyProjectEntryRules(
		tx: Prisma.TransactionClient,
		groupId: string,
		sourceType: 'PROJECT_REVENUE' | 'PROJECT_EXPENSE',
		projectId: string,
		amount: Prisma.Decimal,
		createdById: string,
	): Promise<Transaction[]> {
		const direction = sourceType === 'PROJECT_REVENUE' ? 'CREDIT' : 'DEBIT';

		const rules = await tx.flowRule.findMany({
			where: {
				groupId,
				sourceType,
				sourceRefId: projectId,
				active: true,
			},
			include: { destinations: { orderBy: { sortOrder: 'asc' } } },
		});

		if (rules.length === 0) {
			throw new UnprocessableEntityException(
				`No active ${sourceType} flow rule is configured for this project`,
			);
		}

		const created: Transaction[] = [];

		for (const rule of rules) {
			created.push(
				...(await this.applyRule(
					tx,
					groupId,
					rule.destinations,
					amount,
					sourceType,
					projectId,
					createdById,
					direction,
				)),
			);
		}

		return created;
	}

	private async applyRule(
		tx: Prisma.TransactionClient,
		groupId: string,
		destinations: {
			destinationType: string;
			vaultId: string | null;
			percentage: Prisma.Decimal;
		}[],
		total: Prisma.Decimal,
		sourceType: string,
		sourceRefId: string,
		createdById: string,
		direction: 'CREDIT' | 'DEBIT',
	): Promise<Transaction[]> {
		let allocated = new Prisma.Decimal(0);
		const created: Transaction[] = [];

		for (let i = 0; i < destinations.length; i++) {
			const destination = destinations[i];
			const isLast = i === destinations.length - 1;
			const destinationAmount = isLast
				? total.minus(allocated)
				: total
						.times(destination.percentage)
						.dividedBy(100)
						.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
			allocated = allocated.plus(destinationAmount);

			if (destinationAmount.isZero()) {
				continue;
			}

			if (destination.destinationType === 'VAULT') {
				created.push(
					await this.writeVaultEntry(
						tx,
						groupId,
						destination.vaultId!,
						destinationAmount,
						sourceType,
						sourceRefId,
						createdById,
						direction,
					),
				);
			} else {
				created.push(
					...(await this.splitAcrossMembers(
						tx,
						groupId,
						destinationAmount,
						sourceType,
						sourceRefId,
						createdById,
						direction,
					)),
				);
			}
		}

		return created;
	}

	private async splitAcrossMembers(
		tx: Prisma.TransactionClient,
		groupId: string,
		amount: Prisma.Decimal,
		sourceType: string,
		sourceRefId: string,
		createdById: string,
		direction: 'CREDIT' | 'DEBIT',
	): Promise<Transaction[]> {
		const shares = await tx.memberShareCache.findMany({
			where: { groupId, member: { status: 'ACTIVE' } },
			include: { member: { include: { withdrawableVault: true } } },
			orderBy: { memberId: 'asc' },
		});

		const withShare = shares.filter(
			(s) => !s.percentage.isZero() && s.member.withdrawableVault,
		);

		if (withShare.length === 0) {
			return [];
		}

		let allocated = new Prisma.Decimal(0);
		const created: Transaction[] = [];

		for (let i = 0; i < withShare.length; i++) {
			const share = withShare[i];
			const isLast = i === withShare.length - 1;
			const memberAmount = isLast
				? amount.minus(allocated)
				: amount
						.times(share.percentage)
						.dividedBy(100)
						.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
			allocated = allocated.plus(memberAmount);

			if (memberAmount.isZero()) {
				continue;
			}

			created.push(
				await this.writeVaultEntry(
					tx,
					groupId,
					share.member.withdrawableVault!.id,
					memberAmount,
					sourceType,
					sourceRefId,
					createdById,
					direction,
				),
			);
		}

		return created;
	}

	private async writeVaultEntry(
		tx: Prisma.TransactionClient,
		groupId: string,
		vaultId: string,
		amount: Prisma.Decimal,
		sourceType: string,
		sourceRefId: string,
		createdById: string,
		direction: 'CREDIT' | 'DEBIT',
	): Promise<Transaction> {
		if (direction === 'DEBIT') {
			const debited = await tx.vault.updateMany({
				where: { id: vaultId, cachedBalance: { gte: amount } },
				data: { cachedBalance: { decrement: amount } },
			});

			if (debited.count === 0) {
				throw new UnprocessableEntityException(
					'Insufficient balance to debit this destination',
				);
			}
		} else {
			await tx.vault.update({
				where: { id: vaultId },
				data: { cachedBalance: { increment: amount } },
			});
		}

		return tx.transaction.create({
			data: {
				groupId,
				vaultId,
				direction,
				amount,
				type: 'INTERNAL_FLOW',
				sourceType,
				sourceRefId,
				createdById,
			},
		});
	}

	private assertDestinationsValid(destinations: FlowDestinationDto[]): void {
		const sum = destinations.reduce(
			(acc, d) => acc.plus(new Prisma.Decimal(d.percentage)),
			new Prisma.Decimal(0),
		);

		if (!sum.equals(100)) {
			throw new UnprocessableEntityException(
				'Destination percentages must sum to exactly 100',
			);
		}

		for (const d of destinations) {
			if (d.destinationType === 'VAULT' && !d.vaultId) {
				throw new UnprocessableEntityException(
					'vaultId is required for a VAULT destination',
				);
			}
		}
	}
}
