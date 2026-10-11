import { EventFactory, EventType } from '@bazaar/contracts';
import { ProcessedEventStore } from '@bazaar/nest-common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import type { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import type { OrderSagaService } from '../services/order-saga.service.js';
import type { PaymentSettlementService } from '../services/payment-settlement.service.js';

import { StockRejectedHandler } from './stock-rejected.handler.js';
import { StockReservedHandler } from './stock-reserved.handler.js';

class OnceStore extends ProcessedEventStore<Transaction> {
  private readonly seen = new Set<string>();

  public async runOnce(
    eventId: string,
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<boolean> {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    await work({} as Transaction);
    return true;
  }
}

describe('saga handlers', () => {
  const saga = { markReserved: vi.fn(), rejectForStock: vi.fn() };
  const settlement = { settle: vi.fn() };
  const store = new OnceStore() as unknown as PrismaProcessedEventStore;

  it('mark RESERVED once, but settle on every delivery (settle is idempotent)', async () => {
    const handler = new StockReservedHandler(
      store,
      saga as unknown as OrderSagaService,
      settlement as unknown as PaymentSettlementService,
    );
    const event = EventFactory.create({
      type: EventType.StockReserved,
      aggregateId: 'o1',
      payload: { orderId: 'o1' },
    });

    await handler.handle(event);
    await handler.handle(event);

    expect(saga.markReserved).toHaveBeenCalledOnce();
    expect(settlement.settle).toHaveBeenCalledTimes(2);
  });

  it('cancel for stock on StockRejected', async () => {
    await new StockRejectedHandler(store, saga as unknown as OrderSagaService).handle(
      EventFactory.create({
        type: EventType.StockRejected,
        aggregateId: 'o2',
        payload: { orderId: 'o2', unavailable: [{ variantSku: 'A', requested: 2, available: 0 }] },
      }),
    );
    expect(saga.rejectForStock).toHaveBeenCalledWith('o2', expect.anything());
  });
});
