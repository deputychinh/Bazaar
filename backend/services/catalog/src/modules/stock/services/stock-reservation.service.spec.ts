import { type EventEnvelope, EventType, type OrderCreatedPayload } from '@bazaar/contracts';
import { InMemoryCacheStore } from '@bazaar/nest-common';

import {
  InMemoryStockRepository,
  NO_TRANSACTION,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { ReservationStatus } from '../../../enums/reservation-status.enum.js';

import { StockReservationService } from './stock-reservation.service.js';

const order = (lines: Array<[string, string, string, number]>): OrderCreatedPayload => ({
  orderId: 'order-1',
  shopperId: 'shopper-1',
  totalUsdCents: 0,
  lines: lines.map(([sellerOrderId, productId, variantSku, quantity]) => ({
    sellerOrderId,
    sellerId: `seller-of-${sellerOrderId}`,
    productId,
    variantSku,
    quantity,
    unitPriceUsdCents: 100,
  })),
});

describe('StockReservationService', () => {
  let stock: InMemoryStockRepository;
  let outbox: RecordingOutbox;
  let cache: InMemoryCacheStore;
  let service: StockReservationService;

  beforeEach(() => {
    stock = new InMemoryStockRepository();
    stock.set('p1', 'A', 3);
    stock.set('p2', 'B', 1);
    outbox = new RecordingOutbox();
    cache = new InMemoryCacheStore();
    service = new StockReservationService(stock, outbox, cache);
  });

  it('reserves every line and announces StockReserved', async () => {
    const deleteSpy = vi.spyOn(cache, 'delete');
    await service.reserve(
      order([
        ['so1', 'p1', 'A', 2],
        ['so2', 'p2', 'B', 1],
      ]),
      NO_TRANSACTION,
    );

    expect([stock.units('p1', 'A'), stock.units('p2', 'B')]).toEqual([1, 0]);
    expect(outbox.events.map((event) => event.type)).toEqual([EventType.StockReserved]);
    expect(stock.reservations.get('order-1')?.status).toBe(ReservationStatus.Reserved);
    expect(deleteSpy).toHaveBeenCalledWith('catalog:product:slug-p1', 'catalog:product:slug-p2');
  });

  it('keeps nothing when one line is short, and says how many are left', async () => {
    await service.reserve(
      order([
        ['so1', 'p1', 'A', 2],
        ['so2', 'p2', 'B', 5],
      ]),
      NO_TRANSACTION,
    );

    expect([stock.units('p1', 'A'), stock.units('p2', 'B')]).toEqual([3, 1]);
    const event = outbox.events[0] as EventEnvelope<EventType.StockRejected>;
    expect(event.type).toBe(EventType.StockRejected);
    expect(event.payload.unavailable).toEqual([{ variantSku: 'B', requested: 5, available: 1 }]);
    expect(stock.reservations.has('order-1')).toBe(false);
  });

  it('treats a vanished variant as unavailable', async () => {
    await service.reserve(order([['so1', 'p9', 'Z', 1]]), NO_TRANSACTION);
    expect(
      (outbox.events[0] as EventEnvelope<EventType.StockRejected>).payload.unavailable,
    ).toEqual([{ variantSku: 'Z', requested: 1, available: 0 }]);
  });

  it('never reserves twice for the same order', async () => {
    const created = order([['so1', 'p1', 'A', 1]]);
    await service.reserve(created, NO_TRANSACTION);
    await service.reserve(created, NO_TRANSACTION);

    expect(stock.units('p1', 'A')).toBe(2);
    expect(outbox.events).toHaveLength(1);
  });

  it('releases one seller order, then the rest, each only once', async () => {
    await service.reserve(
      order([
        ['so1', 'p1', 'A', 2],
        ['so2', 'p2', 'B', 1],
      ]),
      NO_TRANSACTION,
    );

    await service.release('order-1', 'so2', NO_TRANSACTION);
    await service.release('order-1', 'so2', NO_TRANSACTION);
    expect([stock.units('p1', 'A'), stock.units('p2', 'B')]).toEqual([1, 1]);
    expect(stock.reservations.get('order-1')?.status).toBe(ReservationStatus.Reserved);

    await service.release('order-1', null, NO_TRANSACTION);
    await service.release('order-1', null, NO_TRANSACTION);
    expect([stock.units('p1', 'A'), stock.units('p2', 'B')]).toEqual([3, 1]);
    expect(stock.reservations.get('order-1')?.status).toBe(ReservationStatus.Released);

    const released = outbox.events.filter((event) => event.type === EventType.StockReleased);
    expect(released.map((event) => event.payload.sellerOrderId)).toEqual(['so2', null]);
  });

  it('blocks a reservation that arrives after its cancellation', async () => {
    await service.release('order-1', null, NO_TRANSACTION);
    await service.reserve(order([['so1', 'p1', 'A', 1]]), NO_TRANSACTION);

    expect(stock.units('p1', 'A')).toBe(3);
    expect(outbox.events).toHaveLength(0);
  });

  it('counts a confirmed order as sold, except seller orders already given back', async () => {
    await service.reserve(
      order([
        ['so1', 'p1', 'A', 2],
        ['so2', 'p2', 'B', 1],
      ]),
      NO_TRANSACTION,
    );
    await service.release('order-1', 'so2', NO_TRANSACTION);

    await service.recordSale('order-1', NO_TRANSACTION);

    expect(stock.sold.get('p1')).toBe(2);
    expect(stock.sold.has('p2')).toBe(false);
  });

  it('counts nothing for an order that holds no stock', async () => {
    await service.release('order-1', null, NO_TRANSACTION);
    await service.recordSale('order-1', NO_TRANSACTION);
    await service.recordSale('missing', NO_TRANSACTION);
    expect(stock.sold.size).toBe(0);
  });
});
