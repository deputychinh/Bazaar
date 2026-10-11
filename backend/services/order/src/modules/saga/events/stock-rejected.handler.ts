import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { OrderSagaService } from '../services/order-saga.service.js';

/** inventory.events → StockRejected: CANCELLED(OUT_OF_STOCK). */
@Injectable()
export class StockRejectedHandler extends BaseEventHandler<EventType.StockRejected, Transaction> {
  public readonly eventType = EventType.StockRejected;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly saga: OrderSagaService,
  ) {
    super(processedEvents);
  }

  protected async process(
    event: EventEnvelope<EventType.StockRejected>,
    transaction: Transaction,
  ): Promise<void> {
    await this.saga.rejectForStock(event.payload.orderId, transaction);
  }
}
