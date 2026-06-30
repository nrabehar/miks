import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { FluxService } from './flux.service.js';
import { CreateFluxRuleDto, UpdateFluxRuleDto, ApplyFluxRuleDto } from './dto/create-flux-rule.dto.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';

@Controller('workspaces/:id/flux-rules')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class FluxController {
  constructor(private readonly flux: FluxService) {}

  @Get()
  list(@Param('id') workspaceId: string) {
    return this.flux.list(workspaceId);
  }

  @Post()
  create(@Param('id') workspaceId: string, @Body() dto: CreateFluxRuleDto) {
    return this.flux.create(workspaceId, dto);
  }

  @Get(':ruleId')
  findOne(@Param('id') workspaceId: string, @Param('ruleId') ruleId: string) {
    return this.flux.findOne(ruleId, workspaceId);
  }

  @Patch(':ruleId')
  update(
    @Param('id') workspaceId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateFluxRuleDto,
  ) {
    return this.flux.update(ruleId, workspaceId, dto);
  }

  /**
   * POST /workspaces/:id/flux-rules/:ruleId/apply
   *
   * Simple mode:  { amount: 1000 }
   * Flow mode:    { amount: 1000, params: { reserveRate: 35, operationsRate: 55 } }
   */
  @Post(':ruleId/apply')
  applyManual(
    @Param('id') workspaceId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: ApplyFluxRuleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.flux.applyManual(ruleId, workspaceId, dto.amount, user.id, dto.params ?? {}, dto.description);
  }

  /**
   * POST /workspaces/:id/flux-rules/:ruleId/preview
   * Dry-run: shows what percent each destination would receive given runtime params.
   */
  @Post(':ruleId/preview')
  previewParams(
    @Param('id') workspaceId: string,
    @Param('ruleId') ruleId: string,
    @Body('params') params: Record<string, number> = {},
  ) {
    return this.flux.previewParams(ruleId, workspaceId, params);
  }
}
