import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { VaultsService } from './vaults/vaults.service.js';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto.js';

function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) +
    '-' +
    randomUUID().slice(0, 6)
  );
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaults: VaultsService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const currency = dto.currency ?? 'MGA';
    const slug = toSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          currency,
          creatorId: userId,
        },
      });

      const member = await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId },
      });

      await (this.vaults as any).createMemberWithdrawableVault(tx, ws.id, member.id, currency);

      return ws;
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true } },
            vaults: { where: { isArchived: false }, select: { balance: true } },
          },
        },
        withdrawableVault: { select: { balance: true, currency: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      myWithdrawableBalance: Number(m.withdrawableVault?.balance ?? 0),
      memberCount: m.workspace._count.members,
      totalGroupBalance: m.workspace.vaults.reduce((s, v) => s + Number(v.balance), 0),
      totalShares: Number(m.totalShares),
      sharePercent: Number(m.sharePercent),
    }));
  }

  async findOne(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        vaults: { where: { isArchived: false }, orderBy: { createdAt: 'asc' } },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
            withdrawableVault: { select: { balance: true, currency: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        fluxRules: { where: { isActive: true }, include: { destinations: true } },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async delete(workspaceId: string, requesterId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { creatorId: true },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    if (ws.creatorId !== requesterId) {
      throw new ForbiddenException('Only the workspace creator can delete it');
    }

    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { deleted: true };
  }
}
