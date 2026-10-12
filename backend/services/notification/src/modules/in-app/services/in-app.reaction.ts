import { type AnyEventEnvelope, EventType, NotificationKind } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import type { EventReaction } from '../../../interfaces/event-reaction.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrderReferenceUtil } from '../../../utils/order-reference.util.js';
import { OrderSummariesRepository } from '../../order-summaries/repositories/order-summaries.repository.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';

/** One in-app notification per order change, for the shopper or the seller concerned (FR-08). */
@Injectable()
export class InAppReaction implements EventReaction {
  public readonly name = 'in-app';

  public constructor(
    private readonly notifications: NotificationsRepository,
    private readonly summaries: OrderSummariesRepository,
  ) {}

  public async react(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    const add = (userId: string, kind: NotificationKind, extra = {}): Promise<void> =>
      this.notifications.create(
        {
          userId,
          kind,
          data: {
            orderId: event.aggregateId,
            orderReference: OrderReferenceUtil.of(event.aggregateId),
            ...extra,
          },
        },
        transaction,
      );
    switch (event.type) {
      case EventType.OrderConfirmed: {
        const summary = await this.summaries.find(event.payload.orderId, transaction);
        await add(event.payload.shopperId, NotificationKind.OrderConfirmed, {
          ...(summary && { amountUsdCents: summary.totalUsdCents }),
        });
        for (const part of summary?.sellers ?? []) {
          await add(part.sellerId, NotificationKind.NewSellerOrder, {
            amountUsdCents: part.subtotalUsdCents,
          });
        }
        return;
      }
      case EventType.OrderCancelled:
        await add(event.payload.shopperId, NotificationKind.OrderCancelled, {
          cancelReason: event.payload.reason,
        });
        return;
      case EventType.OrderCompleted:
        await add(event.payload.shopperId, NotificationKind.OrderCompleted);
        return;
      case EventType.SellerOrderShipped:
        await add(event.payload.shopperId, NotificationKind.SellerOrderShipped);
        return;
      case EventType.SellerOrderDelivered:
        await add(event.payload.shopperId, NotificationKind.SellerOrderDelivered);
        return;
      case EventType.SellerOrderCancelled:
        await add(event.payload.sellerId, NotificationKind.SellerOrderCancelled, {
          cancelReason: event.payload.reason,
        });
        return;
      default:
    }
  }
}
