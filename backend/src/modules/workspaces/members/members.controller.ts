import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';

@Controller('workspaces/:id/members')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@Param('id') workspaceId: string) {
    return this.members.list(workspaceId);
  }

  @Post('invite')
  invite(
    @Param('id') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: any,
  ) {
    return this.members.invite(workspaceId, req.workspaceMember.id, dto.email);
  }

  @Post('accept')
  acceptInvite(
    @Body('token') token: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.members.acceptInvite(token, user.id);
  }

  @Get('me')
  me(@Param('id') workspaceId: string, @CurrentUser() user: { id: string }) {
    return this.members.findByUser(workspaceId, user.id);
  }
}
