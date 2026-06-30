import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { VaultsService } from '../vaults/vaults.service.js';

const INVITE_TTL_DAYS = 7;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaults: VaultsService,
  ) {}

  async invite(workspaceId: string, inviterMemberId: string, targetEmail: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, currency: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const target = await this.prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        id: true,
        firstName: true,
        members: { where: { workspaceId }, select: { id: true } },
      },
    });

    if (target?.members.length) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.inviteToken.create({
      data: { workspaceId, email: targetEmail, expiresAt, createdById: inviterMemberId },
    });

    if (target) {
      await this.acceptInvite(invite.token, target.id);
      return { joined: true, userId: target.id };
    }

    return { invited: true, token: invite.token, expiresAt };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, currency: true } } },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.usedAt) throw new ForbiddenException('Invite already used');
    if (invite.expiresAt < new Date()) throw new ForbiddenException('Invite has expired');

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');

    await this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId },
      });
      await (this.vaults as any).createMemberWithdrawableVault(
        tx,
        invite.workspaceId,
        member.id,
        invite.workspace.currency,
      );
      await tx.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    });

    return { joined: true, workspaceId: invite.workspaceId };
  }

  async list(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
        withdrawableVault: { select: { balance: true, currency: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findByUser(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
        withdrawableVault: { select: { balance: true, currency: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}
