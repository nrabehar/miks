import { CurrentMember } from '$common/decorators/current-member.decorator';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
import type { GroupMember } from '$prisma/client';
import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UpdateVoteConfigDto } from './dto/update-vote-config.dto';
import { VoteConfigService } from './vote-config.service';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId/vote-config')
export class VoteConfigController {
	constructor(private readonly voteConfig: VoteConfigService) {}

	@Patch()
	update(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: UpdateVoteConfigDto,
	) {
		return this.voteConfig.update(groupId, member, dto);
	}
}
