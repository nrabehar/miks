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
import { CreateFlowRuleDto } from './dto/create-flow-rule.dto';
import { ReplaceFlowRuleDto } from './dto/replace-flow-rule.dto';
import { FlowRulesService } from './flow-rules.service';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId/flow-rules')
export class FlowRulesController {
	constructor(private readonly flowRules: FlowRulesService) {}

	@Post()
	create(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: CreateFlowRuleDto,
	) {
		return this.flowRules.create(groupId, member, dto);
	}

	@Get()
	list(@Param('groupId') groupId: string, @Query() query: ListQueryDto) {
		return this.flowRules.list(groupId, query);
	}

	@Post(':id/replace')
	replace(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: ReplaceFlowRuleDto,
	) {
		return this.flowRules.replace(groupId, id, member, dto);
	}
}
