import type { CancelReason, NotificationKind } from '@bazaar/contracts';

export interface NotificationData {
  orderId: string;
  orderReference: string;
  amountUsdCents?: number;
  cancelReason?: CancelReason;
}

export interface NewNotification {
  userId: string;
  kind: NotificationKind;
  data: NotificationData;
}

export interface Notification extends NewNotification {
  id: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  unread: number;
}
