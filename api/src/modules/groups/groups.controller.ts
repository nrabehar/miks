import { CurrentMember } from '$common/decorators/current-member.decorator';
import { CurrentUser } from '$common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { GroupMembershipGuard } from '$common/guards/group-membership.guard';
import type { GroupMember } from '$prisma/client';
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { ProposeRemovalVoteDto } from './dto/propose-removal-vote.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';
import { InvitesService } from './invites.service';
import { VotesService } from './votes.service';

@Controller('groups')
export class GroupsController {
	constructor(
		private readonly groups: GroupsService,
		private readonly invites: InvitesService,
		private readonly votes: VotesService,
	) {}

	@Post()
	create(
		@CurrentUser() user: AuthenticatedUser,
		@Body() dto: CreateGroupDto,
	) {
		return this.groups.create(user.id, dto);
	}

	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
		return this.groups.listForUser(user.id, query);
	}

	@UseGuards(GroupMembershipGuard)
	@Get(':id')
	get(@Param('id') id: string) {
		return this.groups.get(id);
	}

	@UseGuards(GroupMembershipGuard)
	@Patch(':id')
	update(
		@Param('id') id: string,
		@CurrentUser() user: AuthenticatedUser,
		@Body() dto: UpdateGroupDto,
	) {
		return this.groups.update(id, user.id, dto);
	}

	@UseGuards(GroupMembershipGuard)
	@Get(':id/members')
	listMembers(@Param('id') id: string, @Query() query: ListQueryDto) {
		return this.groups.listMembers(id, query);
	}

	@UseGuards(GroupMembershipGuard)
	@Post(':id/leave')
	@HttpCode(HttpStatus.NO_CONTENT)
	leave(@Param('id') id: string, @CurrentMember() member: GroupMember) {
		return this.groups.leave(id, member);
	}

	@UseGuards(GroupMembershipGuard)
	@Post(':id/close')
	@HttpCode(HttpStatus.OK)
	close(@Param('id') id: string, @CurrentMember() member: GroupMember) {
		return this.groups.close(id, member);
	}

	@UseGuards(GroupMembershipGuard)
	@Post(':id/invites')
	createInvite(
		@Param('id') id: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: CreateInviteDto,
	) {
		return this.invites.create(id, member, dto);
	}

	@UseGuards(GroupMembershipGuard)
	@Get(':id/invites')
	listInvites(@Param('id') id: string, @Query() query: ListQueryDto) {
		return this.invites.list(id, query);
	}

	@UseGuards(GroupMembershipGuard)
	@Delete(':id/invites/:inviteId')
	@HttpCode(HttpStatus.NO_CONTENT)
	revokeInvite(
		@Param('id') id: string,
		@Param('inviteId') inviteId: string,
		@CurrentMember() member: GroupMember,
	) {
		return this.invites.revoke(id, inviteId, member);
	}

	@UseGuards(GroupMembershipGuard)
	@Post(':id/members/:memberId/removal-votes')
	proposeRemovalVote(
		@Param('memberId') memberId: string,
		@CurrentMember() member: GroupMember,
		@Body() dto: ProposeRemovalVoteDto,
	) {
		return this.votes.proposeRemoval(member.groupId, memberId, member, dto);
	}
}
