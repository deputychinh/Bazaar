import { CancelReason, NotificationKind } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Prisma } from '#prisma';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  NewNotification,
  NotificationData,
  NotificationPage,
} from '../../../interfaces/notification.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { NotificationsRepository } from './notifications.repository.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

@Injectable()
export class PrismaNotificationsRepository extends NotificationsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async create(notification: NewNotification, transaction: Transaction): Promise<void> {
    await transaction.notification.create({
      data: {
        userId: notification.userId,
        kind: notification.kind,
        orderId: notification.data.orderId,
        data: notification.data as unknown as Prisma.InputJsonObject,
      },
    });
  }

  public async page(
    userId: string,
    page: { page: number; pageSize: number },
  ): Promise<NotificationPage> {
    const [rows, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
      // MongoDB: `readAt: null` misses documents without the field.
      this.prisma.notification.count({
        where: { userId, OR: [{ readAt: null }, { readAt: { isSet: false } }] },
      }),
    ]);
    return {
      total,
      unread,
      items: rows.map((row) => {
        const data = row.data as unknown as NotificationData;
        return {
          id: row.id,
          userId: row.userId,
          kind: EnumUtil.parse(NotificationKind, row.kind),
          data: {
            ...data,
            ...(data.cancelReason !== undefined && {
              cancelReason: EnumUtil.parse(CancelReason, data.cancelReason),
            }),
          },
          readAt: row.readAt,
          createdAt: row.createdAt,
        };
      }),
    };
  }

  public async markRead(userId: string, id: string, at: Date): Promise<boolean> {
    if (!OBJECT_ID.test(id)) return false;
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: at },
    });
    return result.count === 1;
  }

  public async markAllRead(userId: string, at: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, OR: [{ readAt: null }, { readAt: { isSet: false } }] },
      data: { readAt: at },
    });
  }
}
