import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import type { GroupMember, Prisma } from '$prisma/client';
import { Injectable } from '@nestjs/common';
import { UpdateVoteConfigDto } from './dto/update-vote-config.dto';

export interface VoteConfig {
	approvalThreshold: number;
	minQuorum: number;
	durationHours: number;
}

interface GroupMetadataWithVoteConfig {
	voteConfig?: Partial<VoteConfig>;
	[key: string]: unknown;
}

const DEFAULT_VOTE_CONFIG: VoteConfig = {
	approvalThreshold: 50,
	minQuorum: 1,
	durationHours: 72,
};

/**
 * The group's standing default approvalThreshold/minQuorum/durationHours for
 * votes opened automatically (a project submission), stored in
 * Group.metadata (spec 0004, Feature design). Changing it only affects votes
 * opened after the change; a vote already open keeps the config it was
 * opened with.
 */
@Injectable()
export class VoteConfigService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
	) {}

	async get(groupId: string): Promise<VoteConfig> {
		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
		});

		const metadata = group.metadata as GroupMetadataWithVoteConfig;

		return { ...DEFAULT_VOTE_CONFIG, ...metadata.voteConfig };
	}

	async update(
		groupId: string,
		member: GroupMember,
		dto: UpdateVoteConfigDto,
	): Promise<VoteConfig> {
		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
		});

		const metadata = group.metadata as GroupMetadataWithVoteConfig;
		const current = { ...DEFAULT_VOTE_CONFIG, ...metadata.voteConfig };

		const updated: VoteConfig = {
			approvalThreshold: dto.approvalThreshold ?? current.approvalThreshold,
			minQuorum: dto.minQuorum ?? current.minQuorum,
			durationHours: dto.durationHours ?? current.durationHours,
		};

		await this.prisma.group.update({
			where: { id: groupId },
			data: {
				metadata: { ...metadata, voteConfig: updated } as
					unknown as Prisma.InputJsonValue,
			},
		});

		await this.audit.log({
			eventType: 'GROUP_VOTE_CONFIG_UPDATED',
			groupId,
			actorId: member.userId,
			payload: { ...updated },
		});

		return updated;
	}
}
