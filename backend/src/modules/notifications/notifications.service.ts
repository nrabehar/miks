import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  async markRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async send(data: {
    userId: string;
    workspaceId?: string;
    type: string;
    title: string;
    body: string;
    channel?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        workspaceId: data.workspaceId ?? null,
        type: data.type,
        title: data.title,
        body: data.body,
        channel: data.channel ?? 'IN_APP',
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
      },
    });
  }
}
