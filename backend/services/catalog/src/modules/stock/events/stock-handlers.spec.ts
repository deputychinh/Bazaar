import { EventFactory, EventType, CancelReason } from '@bazaar/contracts';
import { ProcessedEventStore } from '@bazaar/nest-common';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import type { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import type { StockReservationService } from '../services/stock-reservation.service.js';

import { OrderCancelledHandler } from './order-cancelled.handler.js';
import { OrderConfirmedHandler } from './order-confirmed.handler.js';
import { OrderCreatedHandler } from './order-created.handler.js';
import { SellerOrderCancelledHandler } from './seller-order-cancelled.handler.js';

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

describe('stock event handlers', () => {
  const reservations = { reserve: vi.fn(), release: vi.fn(), recordSale: vi.fn() };
  const store = new OnceStore() as unknown as PrismaProcessedEventStore;
  const service = reservations as unknown as StockReservationService;
  const line = {
    sellerOrderId: 'so1',
    sellerId: 's1',
    productId: 'p1',
    variantSku: 'A',
    quantity: 1,
    unitPriceUsdCents: 1,
  };

  it('route each order event to the reservation service, once per event id', async () => {
    const created = EventFactory.create({
      type: EventType.OrderCreated,
      aggregateId: 'o1',
      payload: { orderId: 'o1', shopperId: 'u1', totalUsdCents: 1, lines: [line] },
    });
    await new OrderCreatedHandler(store, service).handle(created);
    await new OrderCreatedHandler(store, service).handle(created);
    expect(reservations.reserve).toHaveBeenCalledOnce();

    await new OrderCancelledHandler(store, service).handle(
      EventFactory.create({
        type: EventType.OrderCancelled,
        aggregateId: 'o1',
        payload: {
          orderId: 'o1',
          shopperId: 'u1',
          reason: CancelReason.PaymentFailed,
          lines: [line],
        },
      }),
    );
    expect(reservations.release).toHaveBeenLastCalledWith('o1', null, expect.anything());

    await new SellerOrderCancelledHandler(store, service).handle(
      EventFactory.create({
        type: EventType.SellerOrderCancelled,
        aggregateId: 'o1',
        payload: {
          orderId: 'o1',
          sellerOrderId: 'so1',
          sellerId: 's1',
          shopperId: 'u1',
          reason: CancelReason.ShopperCancelled,
          lines: [line],
        },
      }),
    );
    expect(reservations.release).toHaveBeenLastCalledWith('o1', 'so1', expect.anything());
  });

  it('records the sale of a confirmed order once', async () => {
    const confirmed = EventFactory.create({
      type: EventType.OrderConfirmed,
      aggregateId: 'o2',
      payload: { orderId: 'o2', shopperId: 'u1' },
    });
    await new OrderConfirmedHandler(store, service).handle(confirmed);
    await new OrderConfirmedHandler(store, service).handle(confirmed);
    expect(reservations.recordSale).toHaveBeenCalledOnce();
    expect(reservations.recordSale).toHaveBeenCalledWith('o2', expect.anything());
  });
});
