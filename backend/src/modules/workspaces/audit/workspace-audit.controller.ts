import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';

@Controller('workspaces/:id/audit')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class WorkspaceAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Param('id') workspaceId: string,
    @Query('event') event?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.listForWorkspace(workspaceId, {
      event,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
