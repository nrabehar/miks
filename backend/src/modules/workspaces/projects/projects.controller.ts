import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';

@Controller('workspaces/:id/projects')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Param('id') workspaceId: string, @Query('status') status?: string) {
    return this.projects.list(workspaceId, status);
  }

  @Post()
  create(@Param('id') workspaceId: string, @Body() dto: CreateProjectDto, @Req() req: any) {
    return this.projects.create(workspaceId, req.workspaceMember.id, dto);
  }

  @Get(':projectId')
  findOne(@Param('id') workspaceId: string, @Param('projectId') projectId: string) {
    return this.projects.findOne(projectId, workspaceId);
  }
}
