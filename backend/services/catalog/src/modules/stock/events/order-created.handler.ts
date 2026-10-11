import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { StockReservationService } from '../services/stock-reservation.service.js';

/** order.events → OrderCreated: hold the stock of every line, or reject the order. */
@Injectable()
export class OrderCreatedHandler extends BaseEventHandler<EventType.OrderCreated, Transaction> {
  public readonly eventType = EventType.OrderCreated;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly reservations: StockReservationService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.OrderCreated>,
    transaction: Transaction,
  ): Promise<void> {
    await this.reservations.reserve(event.payload, transaction);
  }
}
