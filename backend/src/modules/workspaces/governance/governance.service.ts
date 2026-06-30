import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getVote(voteId: string, workspaceId: string) {
    const vote = await this.prisma.vote.findFirst({
      where: { id: voteId, workspaceId },
      include: {
        choices: {
          include: {
            member: {
              select: {
                id: true,
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        project: { select: { id: true, title: true, status: true } },
      },
    });
    if (!vote) throw new NotFoundException('Vote not found');
    return vote;
  }

  async listVotes(workspaceId: string, status?: string) {
    return this.prisma.vote.findMany({
      where: { workspaceId, ...(status ? { status } : {}) },
      include: {
        project: { select: { id: true, title: true, status: true } },
        _count: { select: { choices: true } },
      },
      orderBy: { opensAt: 'desc' },
    });
  }

  async castVote(voteId: string, memberId: string, choice: string, workspaceId: string) {
    const vote = await this.prisma.vote.findFirst({
      where: { id: voteId, workspaceId },
    });
    if (!vote) throw new NotFoundException('Vote not found');
    if (vote.status !== 'OPEN') throw new BadRequestException('Vote is not open');
    if (vote.closesAt < new Date()) {
      await this.closeVote(voteId, workspaceId);
      throw new BadRequestException('Vote has expired');
    }

    const existing = await this.prisma.voteChoice.findUnique({
      where: { voteId_memberId: { voteId, memberId } },
    });
    if (existing) throw new ConflictException('You have already voted');

    await this.prisma.$transaction(async (tx) => {
      await tx.voteChoice.create({ data: { voteId, memberId, choice } });

      const countUpdate =
        choice === 'YES'
          ? { yesCount: { increment: 1 } }
          : choice === 'NO'
            ? { noCount: { increment: 1 } }
            : { abstainCount: { increment: 1 } };

      await tx.vote.update({ where: { id: voteId }, data: countUpdate });
    });

    return { voted: true, choice };
  }

  async closeVote(voteId: string, workspaceId: string) {
    const vote = await this.prisma.vote.findFirst({
      where: { id: voteId, workspaceId },
      include: { _count: { select: { choices: true } } },
    });
    if (!vote) throw new NotFoundException('Vote not found');
    if (vote.status !== 'OPEN') throw new BadRequestException('Vote is already closed');

    const total = vote.yesCount + vote.noCount + vote.abstainCount;
    const memberCount = await this.prisma.workspaceMember.count({ where: { workspaceId } });

    let result: string | null = null;

    if (vote.quorum && total < vote.quorum) {
      result = 'INVALIDATED';
    } else {
      const yesPercent = total > 0 ? (vote.yesCount / total) * 100 : 0;
      result = yesPercent >= vote.threshold ? 'APPROVED' : 'REJECTED';
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vote.update({
        where: { id: voteId },
        data: { status: 'CLOSED', result, closedAt: new Date() },
      });

      const newProjectStatus =
        result === 'APPROVED'
          ? 'APPROVED'
          : result === 'REJECTED'
            ? 'REJECTED'
            : 'CANCELLED';

      await tx.project.update({
        where: { id: vote.projectId },
        data: { status: newProjectStatus },
      });
    });

    return { closed: true, result };
  }

  async getMyVote(voteId: string, memberId: string) {
    return this.prisma.voteChoice.findUnique({
      where: { voteId_memberId: { voteId, memberId } },
    });
  }
}
