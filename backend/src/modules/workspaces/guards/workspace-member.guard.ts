import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const user = req.user as { id: string };
    const workspaceId = String(req.params.id ?? req.params.workspaceId ?? '');

    if (!workspaceId) return true;

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      select: { id: true, totalShares: true, sharePercent: true },
    });

    if (!member) throw new NotFoundException('You are not a member of this workspace');

    req.workspaceMember = member;
    return true;
  }
}
