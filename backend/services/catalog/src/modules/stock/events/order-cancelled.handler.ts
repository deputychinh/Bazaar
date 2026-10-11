import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { StockReservationService } from '../services/stock-reservation.service.js';

/** order.events → OrderCancelled: give back whatever the order still holds. */
@Injectable()
export class OrderCancelledHandler extends BaseEventHandler<EventType.OrderCancelled, Transaction> {
  public readonly eventType = EventType.OrderCancelled;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly reservations: StockReservationService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.OrderCancelled>,
    transaction: Transaction,
  ): Promise<void> {
    await this.reservations.release(event.payload.orderId, null, transaction);
  }
}
