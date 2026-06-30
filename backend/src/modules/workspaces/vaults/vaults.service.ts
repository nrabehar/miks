import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

type Tx = {
  vault: any;
  memberWithdrawableVault: any;
  ledgerEntry: any;
};

@Injectable()
export class VaultsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroupVault(
    workspaceId: string,
    data: { name: string; description?: string; currency?: string },
  ) {
    return this.prisma.vault.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description ?? null,
        currency: data.currency ?? 'MGA',
      },
    });
  }

  async createMemberWithdrawableVault(
    tx: Tx,
    workspaceId: string,
    memberId: string,
    currency: string,
  ) {
    return tx.memberWithdrawableVault.create({
      data: { workspaceId, memberId, currency },
    });
  }

  async creditGroupVault(
    tx: Tx,
    opts: {
      vaultId: string;
      workspaceId: string;
      authorId: string;
      amount: number;
      category: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
    },
  ) {
    await tx.vault.update({
      where: { id: opts.vaultId },
      data: { balance: { increment: opts.amount } },
    });
    await tx.ledgerEntry.create({
      data: {
        workspaceId: opts.workspaceId,
        vaultId: opts.vaultId,
        vaultType: 'GROUP_VAULT',
        type: 'IN',
        category: opts.category,
        amount: opts.amount,
        description: opts.description ?? null,
        referenceId: opts.referenceId ?? null,
        referenceType: opts.referenceType ?? null,
        authorId: opts.authorId,
      },
    });
  }

  async debitGroupVault(
    tx: Tx,
    opts: {
      vaultId: string;
      workspaceId: string;
      authorId: string;
      amount: number;
      category: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
    },
  ) {
    await tx.vault.update({
      where: { id: opts.vaultId },
      data: { balance: { decrement: opts.amount } },
    });
    await tx.ledgerEntry.create({
      data: {
        workspaceId: opts.workspaceId,
        vaultId: opts.vaultId,
        vaultType: 'GROUP_VAULT',
        type: 'OUT',
        category: opts.category,
        amount: opts.amount,
        description: opts.description ?? null,
        referenceId: opts.referenceId ?? null,
        referenceType: opts.referenceType ?? null,
        authorId: opts.authorId,
      },
    });
  }

  async creditWithdrawableVault(
    tx: Tx,
    opts: {
      memberId: string;
      workspaceId: string;
      authorId: string;
      amount: number;
      category: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
    },
  ) {
    await tx.memberWithdrawableVault.update({
      where: { memberId: opts.memberId },
      data: {
        balance: { increment: opts.amount },
        totalReceived: { increment: opts.amount },
      },
    });
    await tx.ledgerEntry.create({
      data: {
        workspaceId: opts.workspaceId,
        vaultType: 'WITHDRAWABLE_VAULT',
        type: 'IN',
        category: opts.category,
        amount: opts.amount,
        description: opts.description ?? null,
        referenceId: opts.referenceId ?? null,
        referenceType: opts.referenceType ?? null,
        authorId: opts.authorId,
      },
    });
  }

  async listGroupVaults(workspaceId: string) {
    return this.prisma.vault.findMany({
      where: { workspaceId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getGroupVault(vaultId: string, workspaceId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, workspaceId },
    });
    if (!vault) throw new NotFoundException('Vault not found');
    return vault;
  }

  async archiveGroupVault(vaultId: string, workspaceId: string) {
    await this.getGroupVault(vaultId, workspaceId);
    return this.prisma.vault.update({
      where: { id: vaultId },
      data: { isArchived: true },
    });
  }

  async getLedger(workspaceId: string, vaultId?: string, take = 100) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        workspaceId,
        ...(vaultId ? { vaultId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async exportLedgerCsv(workspaceId: string, vaultId?: string): Promise<string> {
    const entries = await this.getLedger(workspaceId, vaultId, 5000);
    const header = 'date,type,category,amount,currency,vaultType,description,author\n';
    const rows = entries
      .map((e) =>
        [
          (e.createdAt as Date).toISOString(),
          e.type,
          e.category,
          e.amount,
          e.currency,
          e.vaultType,
          `"${String(e.description ?? '').replace(/"/g, '""')}"`,
          e.authorId,
        ].join(','),
      )
      .join('\n');
    return header + rows;
  }
}
