import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { StockReservationService } from '../services/stock-reservation.service.js';

/** order.events → SellerOrderCancelled: give back that seller's lines. */
@Injectable()
export class SellerOrderCancelledHandler extends BaseEventHandler<
  EventType.SellerOrderCancelled,
  Transaction
> {
  public readonly eventType = EventType.SellerOrderCancelled;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly reservations: StockReservationService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.SellerOrderCancelled>,
    transaction: Transaction,
  ): Promise<void> {
    await this.reservations.release(
      event.payload.orderId,
      event.payload.sellerOrderId,
      transaction,
    );
  }
}
