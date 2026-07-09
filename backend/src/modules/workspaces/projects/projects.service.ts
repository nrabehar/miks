import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(workspaceId: string, proposedByMemberId: string, dto: CreateProjectDto) {
    const project = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId,
          proposedById: proposedByMemberId,
          title: dto.title,
          description: dto.description,
          budget: dto.budget ?? null,
          currency: dto.currency ?? 'MGA',
          sourceVaultId: dto.sourceVaultId ?? null,
          status: 'PENDING_VOTE',
        },
      });

      await tx.vote.create({
        data: {
          workspaceId,
          projectId: project.id,
          threshold: dto.voteThreshold,
          quorum: dto.voteQuorum ?? null,
          closesAt: new Date(dto.voteClosesAt),
          status: 'OPEN',
        },
      });

      return project;
    });

    await this.notifyVoteOpened(workspaceId, proposedByMemberId, project.id, project.title);

    return project;
  }

  private async notifyVoteOpened(
    workspaceId: string,
    proposedByMemberId: string,
    projectId: string,
    title: string,
  ) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, id: { not: proposedByMemberId } },
      select: { userId: true },
    });

    await Promise.all(
      members.map((m) =>
        this.notifications.send({
          userId: m.userId,
          workspaceId,
          type: 'VOTE_OPENED',
          title: 'Nouveau vote ouvert',
          body: `Un vote a été ouvert pour le projet "${title}".`,
          referenceType: 'PROJECT',
          referenceId: projectId,
        }),
      ),
    );
  }

  async list(workspaceId: string, status?: string) {
    return this.prisma.project.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      include: {
        proposedBy: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        vote: {
          select: {
            id: true,
            status: true,
            result: true,
            yesCount: true,
            noCount: true,
            abstainCount: true,
            closesAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        proposedBy: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        sourceVault: { select: { id: true, name: true, balance: true } },
        projectVaults: true,
        vote: { include: { choices: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
