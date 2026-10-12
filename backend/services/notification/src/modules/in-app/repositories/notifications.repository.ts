import type {
  NewNotification,
  NotificationPage,
} from '../../../interfaces/notification.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class NotificationsRepository {
  public abstract create(notification: NewNotification, transaction: Transaction): Promise<void>;

  /** Newest first, with the user's total unread count. */
  public abstract page(
    userId: string,
    page: { page: number; pageSize: number },
  ): Promise<NotificationPage>;

  /** Only the owner's notification; false when it is not theirs or does not exist. */
  public abstract markRead(userId: string, id: string, at: Date): Promise<boolean>;

  public abstract markAllRead(userId: string, at: Date): Promise<void>;
}
