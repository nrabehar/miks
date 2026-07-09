import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeExpiredVotes() {
    const expired = await this.prisma.vote.findMany({
      where: { status: 'OPEN', closesAt: { lt: new Date() } },
      select: { id: true, workspaceId: true },
    });

    for (const vote of expired) {
      try {
        await this.closeVote(vote.id, vote.workspaceId);
      } catch (err) {
        this.logger.error(`Failed to auto-close vote ${vote.id}`, err as Error);
      }
    }
  }

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

    let result: string | null = null;

    if (vote.quorum && total < vote.quorum) {
      result = 'INVALIDATED';
    } else {
      const yesPercent = total > 0 ? (vote.yesCount / total) * 100 : 0;
      result = yesPercent >= vote.threshold ? 'APPROVED' : 'REJECTED';
    }

    const project = await this.prisma.$transaction(async (tx) => {
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

      return tx.project.update({
        where: { id: vote.projectId },
        data: { status: newProjectStatus },
      });
    });

    await this.notifyVoteResult(workspaceId, voteId, project.id, project.title, result);

    return { closed: true, result };
  }

  private async notifyVoteResult(
    workspaceId: string,
    voteId: string,
    projectId: string,
    title: string,
    result: string | null,
  ) {
    const [voters, proposer] = await Promise.all([
      this.prisma.voteChoice.findMany({
        where: { voteId },
        select: { member: { select: { userId: true } } },
      }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { proposedBy: { select: { userId: true } } },
      }),
    ]);

    const userIds = new Set(voters.map((v) => v.member.userId));
    if (proposer?.proposedBy) userIds.add(proposer.proposedBy.userId);

    const resultLabel =
      result === 'APPROVED'
        ? 'approuvé'
        : result === 'REJECTED'
          ? 'rejeté'
          : 'invalidé (quorum non atteint)';

    await Promise.all(
      Array.from(userIds).map((userId) =>
        this.notifications.send({
          userId,
          workspaceId,
          type: 'VOTE_RESULT',
          title: 'Résultat du vote',
          body: `Le vote pour le projet "${title}" a été ${resultLabel}.`,
          referenceType: 'PROJECT',
          referenceId: projectId,
        }),
      ),
    );
  }

  async getMyVote(voteId: string, memberId: string) {
    return this.prisma.voteChoice.findUnique({
      where: { voteId_memberId: { voteId, memberId } },
    });
  }
}
