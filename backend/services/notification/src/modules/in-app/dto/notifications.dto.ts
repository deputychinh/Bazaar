import {
  cancelReasonSchema,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  notificationKindSchema,
} from '@bazaar/contracts';
import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const notificationSchema = z
  .object({
    id: z.string(),
    kind: notificationKindSchema,
    data: z.object({
      orderId: z.string(),
      orderReference: z.string(),
      amountUsdCents: z.number().int().optional(),
      cancelReason: cancelReasonSchema.optional(),
    }),
    readAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Notification' });

export const notificationPageSchema = z
  .object({
    items: z.array(notificationSchema),
    total: z.number().int(),
    unread: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: 'NotificationPage' });

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationPageResponse = z.infer<typeof notificationPageSchema>;
