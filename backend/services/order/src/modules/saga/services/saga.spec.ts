import {
  CancelReason,
  type EventEnvelope,
  EventType,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';
import type { PinoLogger } from 'nestjs-pino';

import {
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  NO_TRANSACTION,
  NOW,
  pricedLine,
  RecordingOutbox,
} from '../../../../test/fakes/order.fakes.js';
import type { ChargeRequest, ChargeResult } from '../../../interfaces/payment.interface.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';

import { OrderSagaService } from './order-saga.service.js';
import { PaymentSettlementService } from './payment-settlement.service.js';

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;

describe('order saga', () => {
  let orders: InMemoryOrdersRepository;
  let outbox: RecordingOutbox;
  let provider: FakePaymentProvider;
  let saga: OrderSagaService;
  let settlement: PaymentSettlementService;

  const place = async (card = '4242424242424242'): Promise<string> => {
    const { order } = await new CheckoutService(
      orders,
      provider,
      new ImmediateTransactionManager(),
      outbox,
    ).checkout('shopper-1', {
      idempotencyKey: `k-${orders.rows.length}-xxxxx`,
      card: { number: card },
      lines: [
        pricedLine(),
        pricedLine({ sellerId: 'seller-2', shopId: 'shop-2', productId: 'p2', variantSku: 'B' }),
      ],
    });
    outbox.events.length = 0;
    return order.id;
  };
  const types = (): EventType[] => outbox.events.map((event) => event.type);
  const stored = (id: string) => orders.rows.find((row) => row.id === id)!;

  beforeEach(() => {
    orders = new InMemoryOrdersRepository();
    outbox = new RecordingOutbox();
    provider = new FakePaymentProvider();
    saga = new OrderSagaService(orders, outbox, new FixedClock(NOW));
    settlement = new PaymentSettlementService(
      orders,
      provider,
      new ImmediateTransactionManager(),
      outbox,
      saga,
      logger,
    );
  });

  it('happy path: reserved → paid → confirmed, seller orders confirmed', async () => {
    const id = await place();
    expect(await saga.markReserved(id, NO_TRANSACTION)).toBe(true);
    await settlement.settle(id);

    expect(stored(id).status).toBe(OrderStatus.Confirmed);
    expect(stored(id).payment).toMatchObject({
      status: PaymentStatus.Succeeded,
      providerRef: `ch_fake_${id}`,
    });
    expect(stored(id).sellerOrders.map((sellerOrder) => sellerOrder.status)).toEqual([
      SellerOrderStatus.Confirmed,
      SellerOrderStatus.Confirmed,
    ]);
    expect(types()).toEqual([EventType.OrderPaid, EventType.OrderConfirmed]);
  });

  it('declined card: cancelled with PAYMENT_FAILED and stock given back', async () => {
    const id = await place('4000000000000002');
    await saga.markReserved(id, NO_TRANSACTION);
    await settlement.settle(id);

    expect(stored(id)).toMatchObject({
      status: OrderStatus.Cancelled,
      cancelReason: CancelReason.PaymentFailed,
    });
    expect(stored(id).payment).toMatchObject({
      status: PaymentStatus.Failed,
      failureReason: 'card_declined',
    });
    expect(
      stored(id).sellerOrders.every(
        (sellerOrder) => sellerOrder.status === SellerOrderStatus.Cancelled,
      ),
    ).toBe(true);
    const cancelled = outbox.events[0] as EventEnvelope<EventType.OrderCancelled>;
    expect(cancelled.type).toBe(EventType.OrderCancelled);
    expect(cancelled.payload.lines).toHaveLength(2);
  });

  it('provider timeout counts as a failed payment', async () => {
    vi.useFakeTimers();
    const id = await place('4000000000000119');
    await saga.markReserved(id, NO_TRANSACTION);
    const settling = settlement.settle(id);
    await vi.advanceTimersByTimeAsync(3_100);
    await settling;
    vi.useRealTimers();

    expect(stored(id).payment).toMatchObject({
      status: PaymentStatus.Failed,
      failureReason: 'provider_timeout',
    });
  });

  it('out of stock: cancelled without charging', async () => {
    const id = await place();
    await saga.rejectForStock(id, NO_TRANSACTION);
    await saga.rejectForStock('missing', NO_TRANSACTION);

    expect(stored(id)).toMatchObject({
      status: OrderStatus.Cancelled,
      cancelReason: CancelReason.OutOfStock,
    });
    expect(stored(id).payment).toMatchObject({
      status: PaymentStatus.Failed,
      failureReason: 'not_charged',
    });
    expect(types()).toEqual([EventType.OrderCancelled]);
  });

  it('settles only RESERVED orders, and only once', async () => {
    const id = await place();
    await settlement.settle(id);
    expect(stored(id).status).toBe(OrderStatus.Pending);

    await saga.markReserved(id, NO_TRANSACTION);
    await settlement.settle(id);
    await settlement.settle(id);
    expect(types()).toEqual([EventType.OrderPaid, EventType.OrderConfirmed]);
    await settlement.settle('missing');
  });

  it('money taken for an order cancelled meanwhile becomes a pending refund', async () => {
    const id = await place();
    await saga.markReserved(id, NO_TRANSACTION);
    vi.spyOn(provider, 'charge').mockImplementation(
      (request: ChargeRequest): Promise<ChargeResult> => {
        orders.force(id, OrderStatus.Cancelled);
        return Promise.resolve({ succeeded: true, providerRef: `ch_${request.reference}` });
      },
    );

    await settlement.settle(id);

    expect(stored(id).payment).toMatchObject({ status: PaymentStatus.RefundPending });
    expect(outbox.events).toHaveLength(0);
  });

  it('cancelling a paid order marks the refund instead of failing the payment', async () => {
    const id = await place();
    await saga.markReserved(id, NO_TRANSACTION);
    await settlement.settle(id);

    expect(
      await saga.cancel(stored(id), { reason: CancelReason.ShopperCancelled }, NO_TRANSACTION),
    ).toBe(true);
    expect(stored(id).payment?.status).toBe(PaymentStatus.RefundPending);
    expect(
      await saga.cancel(stored(id), { reason: CancelReason.ShopperCancelled }, NO_TRANSACTION),
    ).toBe(false);
  });
});
