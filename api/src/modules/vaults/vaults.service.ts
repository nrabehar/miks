import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import type { GroupMember, Prisma, Vault } from '$prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVaultDto } from './dto/create-vault.dto';

@Injectable()
export class VaultsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	async createGroupVault(
		groupId: string,
		member: GroupMember,
		dto: CreateVaultDto,
	): Promise<Vault> {
		const vault = await this.prisma.vault.create({
			data: { groupId, type: 'GROUP', name: dto.name },
		});

		await this.audit.log({
			eventType: 'VAULT_CREATED',
			groupId,
			actorId: member.userId,
			payload: { vaultId: vault.id, name: vault.name },
		});

		return vault;
	}

	async list(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.vault.findMany({
				where: { groupId },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'asc' },
			}),
			this.prisma.vault.count({ where: { groupId } }),
		]);

		return { data, page, limit, total };
	}

	async get(groupId: string, vaultId: string): Promise<Vault> {
		const vault = await this.prisma.vault.findFirst({
			where: { id: vaultId, groupId },
		});

		if (!vault) {
			throw new NotFoundException('Vault not found');
		}

		return vault;
	}

	/**
	 * Every ACTIVE member gets exactly one WITHDRAWABLE vault, created only
	 * here, inside the same transaction that creates their ACTIVE GroupMember
	 * (group creation and invite acceptance) — never manually (AC-2).
	 */
	async createWithdrawableVault(
		tx: Prisma.TransactionClient,
		groupId: string,
		memberId: string,
	): Promise<void> {
		await tx.vault.create({
			data: {
				groupId,
				type: 'WITHDRAWABLE',
				name: 'Withdrawable',
				memberId,
			},
		});
	}
}
