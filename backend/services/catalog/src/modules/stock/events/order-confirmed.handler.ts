import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { StockReservationService } from '../services/stock-reservation.service.js';

/** order.events → OrderConfirmed: the reserved units are now sold. */
@Injectable()
export class OrderConfirmedHandler extends BaseEventHandler<EventType.OrderConfirmed, Transaction> {
  public readonly eventType = EventType.OrderConfirmed;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly reservations: StockReservationService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.OrderConfirmed>,
    transaction: Transaction,
  ): Promise<void> {
    await this.reservations.recordSale(event.payload.orderId, transaction);
  }
}
