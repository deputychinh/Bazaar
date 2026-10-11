import {
  CancelReason,
  type EventEnvelope,
  EventType,
  ErrorCode,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { FixedClock, NotFoundError } from '@bazaar/nest-common';
import type { PinoLogger } from 'nestjs-pino';

import {
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  NOW,
  pricedLine,
  RecordingOutbox,
} from '../../../../test/fakes/order.fakes.js';
import type { Order } from '../../../interfaces/order.interface.js';
import { InvalidOrderTransitionError } from '../../orders/errors/invalid-order-transition.error.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';
import { OrderSagaService } from '../../saga/services/order-saga.service.js';
import { PaymentSettlementService } from '../../saga/services/payment-settlement.service.js';

import { FulfilmentService } from './fulfilment.service.js';

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;

describe('FulfilmentService', () => {
  let orders: InMemoryOrdersRepository;
  let outbox: RecordingOutbox;
  let fulfilment: FulfilmentService;
  let order: Order;

  const confirmedOrder = async (): Promise<Order> => {
    const transactions = new ImmediateTransactionManager();
    const provider = new FakePaymentProvider();
    const saga = new OrderSagaService(orders, outbox, new FixedClock(NOW));
    const { order: placed } = await new CheckoutService(
      orders,
      provider,
      transactions,
      outbox,
    ).checkout('shopper-1', {
      idempotencyKey: `ful-${orders.rows.length}-xxxx`,
      card: { number: '4242424242424242' },
      lines: [
        pricedLine(),
        pricedLine({ sellerId: 'seller-2', shopId: 'shop-2', productId: 'p2', variantSku: 'B' }),
      ],
    });
    await saga.markReserved(placed.id, {} as never);
    await new PaymentSettlementService(orders, provider, transactions, outbox, saga, logger).settle(
      placed.id,
    );
    outbox.events.length = 0;
    return (await orders.findById(placed.id)) as Order;
  };
  const part = (index: number): string => order.sellerOrders[index]?.id ?? '';
  const types = (): EventType[] => outbox.events.map((event) => event.type);

  beforeEach(async () => {
    orders = new InMemoryOrdersRepository();
    outbox = new RecordingOutbox();
    fulfilment = new FulfilmentService(
      orders,
      new ImmediateTransactionManager(),
      outbox,
      new OrderSagaService(orders, outbox, new FixedClock(NOW)),
      new FixedClock(NOW),
    );
    order = await confirmedOrder();
  });

  it('ships and delivers, then completes the order when every part is final', async () => {
    await fulfilment.ship('seller-1', part(0));
    const delivered = await fulfilment.deliver('seller-1', part(0));
    expect(delivered.sellerOrders[0]).toMatchObject({
      status: SellerOrderStatus.Delivered,
      deliveredAt: NOW,
    });
    expect(delivered.status).toBe(OrderStatus.Confirmed);

    await fulfilment.cancelByShopper('shopper-1', order.id, part(1));
    const finished = await orders.findById(order.id);

    expect(finished?.status).toBe(OrderStatus.Completed);
    expect(finished?.payment?.status).toBe(PaymentStatus.RefundPending);
    expect(types()).toEqual([
      EventType.SellerOrderShipped,
      EventType.SellerOrderDelivered,
      EventType.SellerOrderCancelled,
      EventType.OrderCompleted,
    ]);
    const deliveredEvent = outbox.events[1] as EventEnvelope<EventType.SellerOrderDelivered>;
    expect(deliveredEvent.payload.productIds).toEqual(['p1']);
    const cancelledEvent = outbox.events[2] as EventEnvelope<EventType.SellerOrderCancelled>;
    expect(cancelledEvent.payload).toMatchObject({
      reason: CancelReason.ShopperCancelled,
      lines: [expect.objectContaining({ productId: 'p2' })],
    });
  });

  it('cancels the whole order when the shopper cancels every part', async () => {
    await fulfilment.cancelByShopper('shopper-1', order.id, part(0));
    await fulfilment.cancelByShopper('shopper-1', order.id, part(1));

    expect((await orders.findById(order.id))?.status).toBe(OrderStatus.Cancelled);
    expect(types()).toEqual([
      EventType.SellerOrderCancelled,
      EventType.SellerOrderCancelled,
      EventType.OrderCancelled,
    ]);
  });

  it('hides other people’s orders and refuses impossible moves', async () => {
    await expect(fulfilment.ship('seller-2', part(0))).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      fulfilment.cancelByShopper('someone-else', order.id, part(0)),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(fulfilment.ship('seller-1', 'missing')).rejects.toBeInstanceOf(NotFoundError);

    await expect(fulfilment.deliver('seller-1', part(0))).rejects.toMatchObject({
      code: ErrorCode.InvalidOrderTransition,
    });
    await fulfilment.ship('seller-1', part(0));
    await expect(fulfilment.cancelByShopper('shopper-1', order.id, part(0))).rejects.toBeInstanceOf(
      InvalidOrderTransitionError,
    );
  });

  it('leaves unconfirmed orders to the saga', async () => {
    orders.force(order.id, OrderStatus.Reserved);
    await expect(fulfilment.ship('seller-1', part(0))).rejects.toBeInstanceOf(
      InvalidOrderTransitionError,
    );
  });

  it('reports a part that changed between read and write', async () => {
    vi.spyOn(orders, 'transitionSellerOrder').mockResolvedValueOnce(false);
    await expect(fulfilment.ship('seller-1', part(0))).rejects.toBeInstanceOf(
      InvalidOrderTransitionError,
    );
  });
});
