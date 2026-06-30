import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
