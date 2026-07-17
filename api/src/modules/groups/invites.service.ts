import { AuditService } from '$lib/audit/audit.service';
import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { NotificationDeliveryService } from '$lib/notification-delivery/notification-delivery.service';
import type { GroupInvite, GroupMember } from '$prisma/client';
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { GroupsService } from './groups.service';

@Injectable()
export class InvitesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly notifications: NotificationDeliveryService,
		private readonly config: ConfigService,
		private readonly audit: AuditService,
		private readonly groups: GroupsService,
	) {}

	async create(
		groupId: string,
		member: GroupMember,
		dto: CreateInviteDto,
	): Promise<GroupInvite> {
		await this.groups.assertNotClosed(groupId);

		const existingMember = await this.prisma.groupMember.findFirst({
			where: { groupId, status: 'ACTIVE', user: { email: dto.email } },
		});

		if (existingMember) {
			throw new ConflictException(
				'This person is already an active member',
			);
		}

		const pending = await this.prisma.groupInvite.findFirst({
			where: { groupId, email: dto.email, status: 'PENDING' },
		});

		if (pending) {
			throw new ConflictException(
				'A pending invite already exists for this email',
			);
		}

		const token = randomBytes(32).toString('hex');

		const invite = await this.prisma.groupInvite.create({
			data: {
				groupId,
				email: dto.email,
				tokenHash: this.hashToken(token),
				invitedByMemberId: member.id,
				expiresAt: this.expiryDate(),
			},
		});

		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
		});
		const acceptUrl = `${this.config.oauth.webUrl}/invites/${token}`;

		try {
			await this.notifications.sendCode(
				dto.email,
				`You're invited to join ${group.name} on MIKS`,
				`You've been invited to join the group "${group.name}" on MIKS. Accept your invite: ${acceptUrl}`,
			);
		} catch (error) {
			// The invite must not survive a failed send: left in place, it would
			// block every future invite to this email with a 409 "pending invite
			// already exists", with no id the caller could use to revoke it.
			await this.prisma.groupInvite.delete({ where: { id: invite.id } });
			throw error;
		}

		await this.audit.log({
			eventType: 'INVITE_SENT',
			groupId,
			actorId: member.userId,
			payload: { inviteId: invite.id, email: dto.email },
		});

		return invite;
	}

	async list(groupId: string, query: ListQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const [data, total] = await Promise.all([
			this.prisma.groupInvite.findMany({
				where: { groupId, status: 'PENDING' },
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.groupInvite.count({
				where: { groupId, status: 'PENDING' },
			}),
		]);

		return { data, page, limit, total };
	}

	async revoke(
		groupId: string,
		inviteId: string,
		member: GroupMember,
	): Promise<void> {
		const invite = await this.prisma.groupInvite.findFirst({
			where: { id: inviteId, groupId },
		});

		if (!invite) {
			throw new NotFoundException('Invite not found');
		}

		if (invite.status !== 'PENDING') {
			throw new ConflictException(
				'This invite has already been accepted, revoked, or expired',
			);
		}

		await this.prisma.groupInvite.update({
			where: { id: inviteId },
			data: { status: 'REVOKED' },
		});

		await this.audit.log({
			eventType: 'INVITE_REVOKED',
			groupId,
			actorId: member.userId,
			payload: { inviteId },
		});
	}

	async preview(token: string) {
		const invite = await this.loadInvite(token);

		if (invite.status !== 'PENDING') {
			throw new NotFoundException('This invite is no longer valid');
		}

		const [group, inviter] = await Promise.all([
			this.prisma.group.findUniqueOrThrow({
				where: { id: invite.groupId },
			}),
			this.prisma.groupMember.findUniqueOrThrow({
				where: { id: invite.invitedByMemberId },
				include: { user: true },
			}),
		]);

		return {
			groupName: group.name,
			invitedBy: inviter.user.displayName,
			expiresAt: invite.expiresAt,
		};
	}

	async accept(
		token: string,
		userId: string,
		userEmail: string | null,
	): Promise<GroupMember> {
		const invite = await this.loadInvite(token);

		if (invite.status !== 'PENDING') {
			throw new ConflictException(
				'This invite has already been accepted, revoked, or expired',
			);
		}

		if (userEmail !== invite.email) {
			throw new ForbiddenException(
				'This invite was sent to a different email address',
			);
		}

		const member = await this.prisma.$transaction(async (tx) => {
			const consumed = await tx.groupInvite.updateMany({
				where: { id: invite.id, status: 'PENDING' },
				data: { status: 'ACCEPTED', acceptedAt: new Date() },
			});

			if (consumed.count === 0) {
				throw new ConflictException(
					'This invite has already been used',
				);
			}

			return tx.groupMember.create({
				data: { groupId: invite.groupId, userId },
			});
		});

		await this.audit.log({
			eventType: 'INVITE_ACCEPTED',
			groupId: invite.groupId,
			actorId: userId,
			payload: { inviteId: invite.id },
		});

		return member;
	}

	private async loadInvite(token: string): Promise<GroupInvite> {
		const tokenHash = this.hashToken(token);
		const invite = await this.prisma.groupInvite.findFirst({
			where: { tokenHash },
		});

		if (!invite) {
			throw new NotFoundException('Invalid invite token');
		}

		if (invite.status === 'PENDING' && invite.expiresAt < new Date()) {
			await this.prisma.groupInvite.update({
				where: { id: invite.id },
				data: { status: 'EXPIRED' },
			});

			await this.audit.log({
				eventType: 'INVITE_EXPIRED',
				groupId: invite.groupId,
				payload: { inviteId: invite.id },
			});

			return { ...invite, status: 'EXPIRED' };
		}

		return invite;
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex');
	}

	private expiryDate(): Date {
		return new Date(
			Date.now() +
				this.config.groups.inviteExpiryDays * 24 * 60 * 60 * 1000,
		);
	}
}
