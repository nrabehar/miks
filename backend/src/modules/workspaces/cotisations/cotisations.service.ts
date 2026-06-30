import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { VaultsService } from '../vaults/vaults.service.js';
import type { RecordCotisationsDto } from './dto/record-cotisations.dto.js';

@Injectable()
export class CotisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaults: VaultsService,
  ) {}

  async recordBatch(workspaceId: string, dto: RecordCotisationsDto, authorId: string) {
    const [fluxRules, allMembers] = await Promise.all([
      this.prisma.fluxRule.findMany({
        where: { workspaceId, isActive: true, sourceType: 'COTISATION' },
        include: { destinations: true },
      }),
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { id: true, totalShares: true, sharePercent: true },
      }),
    ]);

    const results = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];

      const sharesAccum: Record<string, number> = {};

      for (const entry of dto.entries) {
        const member = await tx.workspaceMember.findUnique({
          where: { id: entry.memberId },
          select: { id: true, workspaceId: true, totalShares: true },
        });

        if (!member || member.workspaceId !== workspaceId) {
          throw new BadRequestException(`Member ${entry.memberId} not found in workspace`);
        }

        const cotisation = await tx.cotisation.create({
          data: {
            workspaceId,
            memberId: entry.memberId,
            amount: entry.amount,
            period: entry.period ?? null,
            note: entry.note ?? null,
            recordedById: authorId,
          },
        });

        sharesAccum[entry.memberId] = (sharesAccum[entry.memberId] ?? 0) + entry.amount;

        // Apply FluxRules
        for (const rule of fluxRules) {
          for (const dest of rule.destinations) {
            const allocationAmount = (entry.amount * Number(dest.percent)) / 100;

            if (dest.targetType === 'GROUP_VAULT' && dest.targetVaultId) {
              await (this.vaults as any).creditGroupVault(tx, {
                vaultId: dest.targetVaultId,
                workspaceId,
                authorId,
                amount: allocationAmount,
                category: 'COTISATION',
                description: `Cotisation – rule: ${rule.name}`,
                referenceId: cotisation.id,
                referenceType: 'cotisation',
              });
            }

            if (dest.targetType === 'WITHDRAWABLE_VAULTS') {
              for (const m of allMembers) {
                const memberShare = (allocationAmount * Number(m.sharePercent)) / 100;
                if (memberShare <= 0) continue;
                await (this.vaults as any).creditWithdrawableVault(tx, {
                  memberId: m.id,
                  workspaceId,
                  authorId,
                  amount: memberShare,
                  category: 'COTISATION_FLUX',
                  description: `Flux cotisation – rule: ${rule.name}`,
                  referenceId: cotisation.id,
                  referenceType: 'cotisation',
                });
              }
            }
          }
        }

        created.push(cotisation);
      }

      // Update totalShares for each member that paid in this batch
      for (const [memberId, addedShares] of Object.entries(sharesAccum)) {
        await tx.workspaceMember.update({
          where: { id: memberId },
          data: { totalShares: { increment: addedShares } },
        });
      }

      // Recalculate sharePercent for all members
      const updatedMembers = await tx.workspaceMember.findMany({
        where: { workspaceId },
        select: { id: true, totalShares: true },
      });

      const totalShares = updatedMembers.reduce(
        (s, m) => s + Number(m.totalShares),
        0,
      );

      for (const m of updatedMembers) {
        const sharePercent =
          totalShares > 0 ? (Number(m.totalShares) / totalShares) * 100 : 0;
        await tx.workspaceMember.update({
          where: { id: m.id },
          data: { sharePercent },
        });
      }

      return created;
    });

    return { recorded: results.length, cotisations: results };
  }

  async list(workspaceId: string, filters: { period?: string; memberId?: string } = {}) {
    return this.prisma.cotisation.findMany({
      where: {
        workspaceId,
        ...(filters.period ? { period: filters.period } : {}),
        ...(filters.memberId ? { memberId: filters.memberId } : {}),
      },
      include: {
        member: {
          select: {
            id: true,
            totalShares: true,
            sharePercent: true,
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEquity(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        withdrawableVault: { select: { balance: true, currency: true } },
      },
      orderBy: { sharePercent: 'desc' },
    });

    return members.map((m) => ({
      memberId: m.id,
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      avatarUrl: m.user.avatarUrl,
      totalShares: Number(m.totalShares),
      sharePercent: Number(m.sharePercent),
      withdrawableBalance: Number(m.withdrawableVault?.balance ?? 0),
      currency: m.withdrawableVault?.currency ?? 'MGA',
    }));
  }

  async getSummary(workspaceId: string) {
    const [vaults, memberCount, lastCotisation] = await Promise.all([
      this.prisma.vault.findMany({
        where: { workspaceId, isArchived: false },
        select: { id: true, name: true, balance: true, currency: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.cotisation.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        select: { period: true, createdAt: true },
      }),
    ]);

    const totalGroupBalance = vaults.reduce((s, v) => s + Number(v.balance), 0);

    return {
      vaults: vaults.map((v) => ({
        id: v.id,
        name: v.name,
        balance: Number(v.balance),
        currency: v.currency,
      })),
      totalGroupBalance,
      memberCount,
      lastCotisation,
    };
  }
}
