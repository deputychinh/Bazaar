import { type EventEnvelope, EventType, OrderStatus, SellerOrderStatus } from '@bazaar/contracts';
import { ValidationError } from '@bazaar/nest-common';

import {
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  pricedLine,
  RecordingOutbox,
} from '../../../../test/fakes/order.fakes.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';
import { DuplicateIdempotencyKeyError } from '../errors/duplicate-idempotency-key.error.js';

import { CheckoutService } from './checkout.service.js';

const CARD = { number: '4242424242424242' };

describe('CheckoutService', () => {
  let orders: InMemoryOrdersRepository;
  let outbox: RecordingOutbox;
  let service: CheckoutService;

  beforeEach(() => {
    orders = new InMemoryOrdersRepository();
    outbox = new RecordingOutbox();
    service = new CheckoutService(
      orders,
      new FakePaymentProvider(),
      new ImmediateTransactionManager(),
      outbox,
    );
  });

  it('creates a pending order split by seller and announces it', async () => {
    const { order, created } = await service.checkout('shopper-1', {
      idempotencyKey: 'checkout-0001',
      card: CARD,
      lines: [
        pricedLine({ quantity: 2 }),
        pricedLine({
          sellerId: 'seller-2',
          shopId: 'shop-2',
          productId: 'p2',
          variantSku: 'MUG',
          unitPriceUsdCents: 999,
        }),
      ],
    });

    expect(created).toBe(true);
    expect(order).toMatchObject({
      status: OrderStatus.Pending,
      totalUsdCents: 3999,
      payment: { cardLast4: '4242' },
    });
    expect(order.sellerOrders.map((sellerOrder) => sellerOrder.status)).toEqual([
      SellerOrderStatus.Pending,
      SellerOrderStatus.Pending,
    ]);
    const event = outbox.events[0] as EventEnvelope<EventType.OrderCreated>;
    expect(event.type).toBe(EventType.OrderCreated);
    expect(event.aggregateId).toBe(order.id);
    expect(event.payload.lines).toEqual([
      expect.objectContaining({
        sellerOrderId: order.sellerOrders[0]?.id,
        productId: 'p1',
        quantity: 2,
      }),
      expect.objectContaining({
        sellerOrderId: order.sellerOrders[1]?.id,
        productId: 'p2',
        variantSku: 'MUG',
      }),
    ]);
  });

  it('returns the first order when the same key is replayed (no second event)', async () => {
    const request = { idempotencyKey: 'checkout-0002', card: CARD, lines: [pricedLine()] };
    const first = await service.checkout('shopper-1', request);
    const replay = await service.checkout('shopper-1', request);

    expect(replay).toEqual({ order: first.order, created: false });
    expect(orders.rows).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
  });

  it('keys are per shopper', async () => {
    const request = { idempotencyKey: 'checkout-0003', card: CARD, lines: [pricedLine()] };
    await service.checkout('shopper-1', request);
    expect((await service.checkout('shopper-2', request)).created).toBe(true);
  });

  it('answers a racing duplicate with the winner', async () => {
    const request = { idempotencyKey: 'checkout-0004', card: CARD, lines: [pricedLine()] };
    const winner = await service.checkout('shopper-1', request);
    // Simulate the race: the pre-check misses, the insert hits the unique key.
    vi.spyOn(orders, 'findByIdempotencyKey').mockResolvedValueOnce(null);

    expect(await service.checkout('shopper-1', request)).toEqual({
      order: winner.order,
      created: false,
    });
  });

  it('rethrows a duplicate it cannot resolve and refuses an invalid card', async () => {
    vi.spyOn(orders, 'findByIdempotencyKey').mockResolvedValue(null);
    vi.spyOn(orders, 'create').mockRejectedValue(new DuplicateIdempotencyKeyError('dup'));
    await expect(
      service.checkout('shopper-1', {
        idempotencyKey: 'checkout-0005',
        card: CARD,
        lines: [pricedLine()],
      }),
    ).rejects.toBeInstanceOf(DuplicateIdempotencyKeyError);

    await expect(
      service.checkout('shopper-1', {
        idempotencyKey: 'checkout-0006',
        card: { number: '1111' },
        lines: [pricedLine()],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
