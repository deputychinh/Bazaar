import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { ReviewsRepository } from '../repositories/reviews.repository.js';

/** order.events → SellerOrderDelivered: the shopper may now review what they received. */
@Injectable()
export class SellerOrderDeliveredHandler extends BaseEventHandler<
  EventType.SellerOrderDelivered,
  Transaction
> {
  public readonly eventType = EventType.SellerOrderDelivered;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly reviews: ReviewsRepository,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.SellerOrderDelivered>,
    transaction: Transaction,
  ): Promise<void> {
    await this.reviews.markEligible(event.payload.shopperId, event.payload.productIds, transaction);
  }
}
