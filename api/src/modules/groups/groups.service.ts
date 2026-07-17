import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { VaultsService } from '$/vaults/vaults.service';
import type { Group, GroupMember } from '$prisma/client';
import {
	ConflictException,
	Injectable,
	UnprocessableEntityException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		private readonly vaults: VaultsService,
	) {}

	async create(userId: string, dto: CreateGroupDto): Promise<Group> {
		const currency = await this.prisma.currency.findUnique({
			where: { code: dto.currencyCode },
		});

		if (!currency) {
			throw new UnprocessableEntityException('Unknown currency code');
		}

		const group = await this.prisma.$transaction(async (tx) => {
			const created = await tx.group.create({
				data: {
					name: dto.name,
					description: dto.description,
					currencyCode: dto.currencyCode,
					creatorId: userId,
				},
			});

			const creatorMember = await tx.groupMember.create({
				data: { groupId: created.id, userId },
			});

			// AC-2: every ACTIVE member gets a WITHDRAWABLE vault the moment
			// they become one, including the creator, created automatically.
			await this.vaults.createWithdrawableVault(
				tx,
				created.id,
				creatorMember.id,
			);

			return created;
		});

		await this.audit.log({
			eventType: 'GROUP_CREATED',
			groupId: group.id,
			actorId: userId,
			payload: { name: group.name, currencyCode: group.currencyCode },
		});

		return group;
	}

	async listForUser(userId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.group.findMany({
				where: { members: { some: { userId, status: 'ACTIVE' } } },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.group.count({
				where: { members: { some: { userId, status: 'ACTIVE' } } },
			}),
		]);

		return { data, page, limit, total };
	}

	async get(groupId: string): Promise<Group> {
		return this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
	}

	async update(
		groupId: string,
		userId: string,
		dto: UpdateGroupDto,
	): Promise<Group> {
		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
		});

		if (group.status === 'CLOSED') {
			throw new ConflictException('This group is closed');
		}

		if (dto.currencyCode) {
			const currency = await this.prisma.currency.findUnique({
				where: { code: dto.currencyCode },
			});

			if (!currency) {
				throw new UnprocessableEntityException('Unknown currency code');
			}
		}

		const updated = await this.prisma.group.update({
			where: { id: groupId },
			data: {
				name: dto.name,
				description: dto.description,
				currencyCode: dto.currencyCode,
			},
		});

		await this.audit.log({
			eventType: 'GROUP_EDITED',
			groupId,
			actorId: userId,
			payload: dto as Record<string, unknown>,
		});

		return updated;
	}

	async listMembers(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.groupMember.findMany({
				where: { groupId },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { joinedAt: 'asc' },
			}),
			this.prisma.groupMember.count({ where: { groupId } }),
		]);

		return { data, page, limit, total };
	}

	async leave(groupId: string, member: GroupMember): Promise<void> {
		const activeCount = await this.prisma.groupMember.count({
			where: { groupId, status: 'ACTIVE' },
		});

		if (activeCount <= 1) {
			throw new ConflictException(
				'The last active member cannot leave; close the group instead',
			);
		}

		await this.prisma.groupMember.update({
			where: { id: member.id },
			data: { status: 'LEFT', leftAt: new Date() },
		});

		await this.audit.log({
			eventType: 'MEMBER_LEFT',
			groupId,
			actorId: member.userId,
			payload: { memberId: member.id },
		});
	}

	async close(groupId: string, member: GroupMember): Promise<Group> {
		const activeCount = await this.prisma.groupMember.count({
			where: { groupId, status: 'ACTIVE' },
		});

		if (activeCount !== 1) {
			throw new ConflictException(
				'Only the last remaining active member can close this group',
			);
		}

		const group = await this.prisma.group.update({
			where: { id: groupId },
			data: { status: 'CLOSED', closedAt: new Date() },
		});

		await this.audit.log({
			eventType: 'GROUP_CLOSED',
			groupId,
			actorId: member.userId,
		});

		return group;
	}

	async assertNotClosed(groupId: string): Promise<void> {
		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
		});

		if (group.status === 'CLOSED') {
			throw new ConflictException('This group is closed');
		}
	}
}
