import { PrismaService } from '#/core/prisma/prisma.service';
import { UsersService } from '$/users/users.service';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

const MEMBER_SELECT = {
	id: true,
	email: true,
	username: true,
	firstName: true,
	lastName: true,
	avatarUrl: true,
} as const;

@Injectable()
export class WorkspacesService {
	private readonly logger = new Logger(WorkspacesService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly usersService: UsersService,
	) {}

	async create(name: string, creatorId: string) {
		const slug = toSlug(name);

		const existing = await this.prisma.workspace.findUnique({ where: { slug } });
		if (existing) {
			throw new ConflictException(
				'A workspace with a similar name already exists. Please choose a different name.',
			);
		}

		const workspace = await this.prisma.workspace.create({
			data: {
				name,
				slug,
				workspaceMembers: {
					create: {
						userId: creatorId,
						role: 'admin',
						activityScore: 100,
					},
				},
			},
			include: {
				workspaceMembers: {
					include: { user: { select: MEMBER_SELECT } },
				},
			},
		});

		this.logger.log(`Workspace "${name}" created by user ${creatorId}`);
		return workspace;
	}

	async findAllForUser(userId: string) {
		return this.prisma.workspace.findMany({
			where: {
				workspaceMembers: { some: { userId } },
			},
			include: {
				workspaceMembers: {
					include: { user: { select: MEMBER_SELECT } },
					orderBy: { createdAt: 'asc' },
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async findById(id: string, requesterId: string) {
		const workspace = await this.prisma.workspace.findUnique({
			where: { id },
			include: {
				workspaceMembers: {
					include: { user: { select: MEMBER_SELECT } },
				},
			},
		});

		if (!workspace) throw new NotFoundException('Workspace not found');

		const isMember = workspace.workspaceMembers.some((m) => m.userId === requesterId);
		if (!isMember) throw new ForbiddenException('You are not a member of this workspace');

		return workspace;
	}

	async inviteMember(workspaceId: string, inviterId: string, email: string, role: string = 'member') {
		await this.assertAdmin(workspaceId, inviterId);

		const invitee = await this.usersService.findByIdentifier(email);
		if (!invitee) throw new NotFoundException(`No account found for ${email}`);

		const alreadyMember = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
		});
		if (alreadyMember) throw new ConflictException('User is already a member of this workspace');

		const member = await this.prisma.workspaceMember.create({
			data: { workspaceId, userId: invitee.id, role, activityScore: 100 },
			include: { user: { select: MEMBER_SELECT } },
		});

		this.logger.log(`User ${invitee.id} invited to workspace ${workspaceId} by ${inviterId}`);
		return member;
	}

	async removeMember(workspaceId: string, requesterId: string, targetUserId: string) {
		// Allow self-removal or admin removal
		if (requesterId !== targetUserId) {
			await this.assertAdmin(workspaceId, requesterId);
		}

		const member = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
		});
		if (!member) throw new NotFoundException('Member not found in this workspace');

		// Cannot remove the last admin
		if (member.role === 'admin') {
			const adminCount = await this.prisma.workspaceMember.count({
				where: { workspaceId, role: 'admin' },
			});
			if (adminCount <= 1) {
				throw new ForbiddenException('Cannot remove the last admin. Transfer ownership first.');
			}
		}

		await this.prisma.workspaceMember.delete({
			where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
		});

		this.logger.log(`User ${targetUserId} removed from workspace ${workspaceId}`);
	}

	async updateMemberRole(workspaceId: string, requesterId: string, targetUserId: string, role: string) {
		await this.assertAdmin(workspaceId, requesterId);

		const member = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
		});
		if (!member) throw new NotFoundException('Member not found in this workspace');

		return this.prisma.workspaceMember.update({
			where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
			data: { role },
			include: { user: { select: MEMBER_SELECT } },
		});
	}

	async delete(workspaceId: string, requesterId: string) {
		await this.assertAdmin(workspaceId, requesterId);

		await this.prisma.workspace.delete({ where: { id: workspaceId } });
		this.logger.log(`Workspace ${workspaceId} deleted by ${requesterId}`);
	}

	private async assertAdmin(workspaceId: string, userId: string): Promise<void> {
		const member = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId } },
		});
		if (!member) throw new ForbiddenException('You are not a member of this workspace');
		if (member.role !== 'admin') throw new ForbiddenException('Only admins can perform this action');
	}
}
