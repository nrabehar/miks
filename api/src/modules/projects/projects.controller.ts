import { CurrentMember } from '$common/decorators/current-member.decorator';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
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
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectTransactionsQueryDto } from './dto/list-project-transactions-query.dto';
import { RecordProjectEntryDto } from './dto/record-project-entry.dto';
import { ListQueryDto } from '$/groups/dto/list-query.dto';
import { ProjectEntriesService } from './project-entries.service';
import { ProjectsService } from './projects.service';

@UseGuards(GroupMembershipGuard)
@Controller('groups/:groupId/projects')
export class ProjectsController {
	constructor(
		private readonly projects: ProjectsService,
		private readonly entries: ProjectEntriesService,
	) {}

	@Post()
	submit(
		@Param('groupId') groupId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: CreateProjectDto,
	) {
		return this.projects.submit(groupId, member, dto);
	}

	@Get()
	list(@Param('groupId') groupId: string, @Query() query: ListQueryDto) {
		return this.projects.list(groupId, query);
	}

	@Get(':id')
	get(@Param('groupId') groupId: string, @Param('id') id: string) {
		return this.projects.get(groupId, id);
	}

	@Post(':id/votes')
	reopenVote(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.projects.reopenVote(groupId, id, member);
	}

	@Post(':id/revenue')
	recordRevenue(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: RecordProjectEntryDto,
	) {
		return this.entries.recordRevenue(groupId, id, member, dto);
	}

	@Post(':id/expense')
	recordExpense(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: RecordProjectEntryDto,
	) {
		return this.entries.recordExpense(groupId, id, member, dto);
	}

	@Post(':id/entries/:transactionId/reverse')
	reverseEntry(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@Param('transactionId') transactionId: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.entries.reverse(groupId, id, transactionId, member);
	}

	@Post(':id/close')
	close(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.entries.close(groupId, id, member);
	}

	@Get(':id/transactions')
	listTransactions(
		@Param('groupId') groupId: string,
		@Param('id') id: string,
		@Query() query: ListProjectTransactionsQueryDto,
	) {
		return this.entries.listTransactions(groupId, id, query);
	}
}
