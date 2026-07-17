import { CurrentMember } from '$common/decorators/current-member.decorator';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import type { GroupMember } from '$prisma/client';
import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId/contributions')
export class ContributionsController {
	constructor(private readonly contributions: ContributionsService) {}

	@Post()
	create(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: CreateContributionDto,
	) {
		return this.contributions.create(groupId, member, dto);
	}

	@Get()
	list(@Param('groupId') groupId: string, @Query() query: ListQueryDto) {
		return this.contributions.list(groupId, query);
	}

	@Post(':id/reverse')
	reverse(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.contributions.reverse(groupId, id, member);
	}
}
