import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard.js';
import { VaultsService } from './vaults.service.js';

class CreateVaultDto {
  @IsString()
  @MaxLength(100)
  name: string = '';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

@Controller('workspaces/:id/vaults')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class VaultsController {
  constructor(private readonly vaults: VaultsService) {}

  @Get()
  list(@Param('id') workspaceId: string) {
    return this.vaults.listGroupVaults(workspaceId);
  }

  @Post()
  create(@Param('id') workspaceId: string, @Body() dto: CreateVaultDto) {
    return this.vaults.createGroupVault(workspaceId, dto);
  }

  @Get('ledger')
  getLedger(@Param('id') workspaceId: string) {
    return this.vaults.getLedger(workspaceId);
  }

  @Get('ledger/export')
  async exportLedger(
    @Param('id') workspaceId: string,
    @Query('vaultId') vaultId: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.vaults.exportLedgerCsv(workspaceId, vaultId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${workspaceId}.csv"`);
    res.send(csv);
  }

  @Get(':vaultId')
  findOne(@Param('id') workspaceId: string, @Param('vaultId') vaultId: string) {
    return this.vaults.getGroupVault(vaultId, workspaceId);
  }

  @Get(':vaultId/ledger')
  getVaultLedger(@Param('id') workspaceId: string, @Param('vaultId') vaultId: string) {
    return this.vaults.getLedger(workspaceId, vaultId);
  }

  @Patch(':vaultId/archive')
  archive(@Param('id') workspaceId: string, @Param('vaultId') vaultId: string) {
    return this.vaults.archiveGroupVault(vaultId, workspaceId);
  }
}
