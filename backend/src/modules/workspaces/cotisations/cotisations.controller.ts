import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CotisationsService } from './cotisations.service.js';
import { RecordCotisationsDto } from './dto/record-cotisations.dto.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';

@Controller('workspaces/:id/cotisations')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class CotisationsController {
  constructor(private readonly cotisations: CotisationsService) {}

  @Get()
  list(
    @Param('id') workspaceId: string,
    @Query('period') period?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.cotisations.list(workspaceId, { period, memberId });
  }

  @Post('batch')
  recordBatch(
    @Param('id') workspaceId: string,
    @Body() dto: RecordCotisationsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.cotisations.recordBatch(workspaceId, dto, user.id);
  }

  @Get('equity')
  getEquity(@Param('id') workspaceId: string) {
    return this.cotisations.getEquity(workspaceId);
  }

  @Get('summary')
  getSummary(@Param('id') workspaceId: string) {
    return this.cotisations.getSummary(workspaceId);
  }
}
