import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.workspaces.findAllForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Get(':id')
  @UseGuards(WorkspaceMemberGuard)
  findOne(@Param('id') id: string) {
    return this.workspaces.findOne(id);
  }

  @Delete(':id')
  @UseGuards(WorkspaceMemberGuard)
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.workspaces.delete(id, user.id);
  }
}
