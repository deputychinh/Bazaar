import { type AnyEventEnvelope, EventType } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import type { EventReaction } from '../../../interfaces/event-reaction.interface.js';
import type { SellerPart } from '../../../interfaces/order-summary.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrderSummariesRepository } from '../repositories/order-summaries.repository.js';

/** OrderCreated → the order facts later emails need: total and each seller's share. */
@Injectable()
export class OrderSummaryReaction implements EventReaction {
  public readonly name = 'order-summaries';

  public constructor(private readonly summaries: OrderSummariesRepository) {}

  public async react(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    if (event.type !== EventType.OrderCreated) return;
    const parts = new Map<string, SellerPart>();
    for (const line of event.payload.lines) {
      const part = parts.get(line.sellerOrderId) ?? {
        sellerOrderId: line.sellerOrderId,
        sellerId: line.sellerId,
        subtotalUsdCents: 0,
        itemCount: 0,
      };
      part.subtotalUsdCents += line.unitPriceUsdCents * line.quantity;
      part.itemCount += line.quantity;
      parts.set(line.sellerOrderId, part);
    }
    await this.summaries.save(
      {
        orderId: event.payload.orderId,
        shopperId: event.payload.shopperId,
        totalUsdCents: event.payload.totalUsdCents,
        sellers: [...parts.values()],
        createdAt: new Date(event.occurredAt),
      },
      transaction,
    );
  }
}
