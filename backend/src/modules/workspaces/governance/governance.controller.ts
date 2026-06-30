import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { GovernanceService } from './governance.service.js';
import { CastVoteDto } from './dto/cast-vote.dto.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';

@Controller('workspaces/:id/votes')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Get()
  listVotes(@Param('id') workspaceId: string, @Query('status') status?: string) {
    return this.governance.listVotes(workspaceId, status);
  }

  @Get(':voteId')
  getVote(@Param('id') workspaceId: string, @Param('voteId') voteId: string) {
    return this.governance.getVote(voteId, workspaceId);
  }

  @Post(':voteId/cast')
  castVote(
    @Param('id') workspaceId: string,
    @Param('voteId') voteId: string,
    @Body() dto: CastVoteDto,
    @Req() req: any,
  ) {
    return this.governance.castVote(voteId, req.workspaceMember.id, dto.choice, workspaceId);
  }

  @Post(':voteId/close')
  closeVote(@Param('id') workspaceId: string, @Param('voteId') voteId: string) {
    return this.governance.closeVote(voteId, workspaceId);
  }

  @Get(':voteId/my-vote')
  getMyVote(@Param('voteId') voteId: string, @Req() req: any) {
    return this.governance.getMyVote(voteId, req.workspaceMember.id);
  }
}
