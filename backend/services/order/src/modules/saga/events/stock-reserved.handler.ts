import { type EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { OrderSagaService } from '../services/order-saga.service.js';
import { PaymentSettlementService } from '../services/payment-settlement.service.js';

/** inventory.events → StockReserved: RESERVED, then charge the card (after the commit). */
@Injectable()
export class StockReservedHandler extends BaseEventHandler<EventType.StockReserved, Transaction> {
  public readonly eventType = EventType.StockReserved;

  public constructor(
    processedEvents: PrismaProcessedEventStore,
    private readonly saga: OrderSagaService,
    private readonly settlement: PaymentSettlementService,
  ) {
    super(processedEvents);
  }

  /**
   * The charge must not run inside the idempotency transaction (slow external call). If it fails
   * here, the message is retried: the mark is already done and settle() is safe to repeat.
   */
  public override async handle(event: EventEnvelope<EventType.StockReserved>): Promise<void> {
    await super.handle(event);
    await this.settlement.settle(event.payload.orderId);
  }

  protected async process(
    event: EventEnvelope<EventType.StockReserved>,
    transaction: Transaction,
  ): Promise<void> {
    await this.saga.markReserved(event.payload.orderId, transaction);
  }
}
