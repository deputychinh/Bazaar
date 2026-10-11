import { CancelReason, EventType, OrderStatus, PaymentStatus } from '@bazaar/contracts';
import { FixedClock, InMemoryDistributedLock } from '@bazaar/nest-common';
import type { PinoLogger } from 'nestjs-pino';

import {
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  pricedLine,
  RecordingOutbox,
} from '../../../../test/fakes/order.fakes.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';

import { OrderSagaService } from './order-saga.service.js';
import { OrderSweeperService } from './order-sweeper.service.js';
import { PaymentSettlementService } from './payment-settlement.service.js';

const logger = {
  setContext: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as PinoLogger;
const CREATED = new Date('2026-10-11T08:00:00.000Z');

describe('OrderSweeperService', () => {
  let orders: InMemoryOrdersRepository;
  let outbox: RecordingOutbox;
  let clock: FixedClock;
  let lock: InMemoryDistributedLock;
  let sweeper: OrderSweeperService;
  let settlement: PaymentSettlementService;
  /** Moves the clock to `minutes` after the orders were created. */
  const moveTo = (minutes: number): void => {
    clock.advanceBy(CREATED.getTime() + minutes * 60_000 - clock.now().getTime());
  };

  const place = async (status: OrderStatus): Promise<string> => {
    const { order } = await new CheckoutService(
      orders,
      new FakePaymentProvider(),
      new ImmediateTransactionManager(),
      outbox,
    ).checkout('shopper-1', {
      idempotencyKey: `sweep-${orders.rows.length}-xxxx`,
      card: { number: '4242424242424242' },
      lines: [pricedLine()],
    });
    orders.force(order.id, status);
    return order.id;
  };

  beforeEach(() => {
    orders = new InMemoryOrdersRepository();
    outbox = new RecordingOutbox();
    clock = new FixedClock(CREATED);
    lock = new InMemoryDistributedLock();
    const saga = new OrderSagaService(orders, outbox, clock);
    settlement = new PaymentSettlementService(
      orders,
      new FakePaymentProvider(),
      new ImmediateTransactionManager(),
      outbox,
      saga,
      logger,
    );
    sweeper = new OrderSweeperService(
      orders,
      saga,
      settlement,
      new ImmediateTransactionManager(),
      lock,
      clock,
      logger,
    );
  });

  it('cancels orders still waiting after 15 minutes and leaves younger ones', async () => {
    const pending = await place(OrderStatus.Pending);
    const reserved = await place(OrderStatus.Reserved);
    const confirmed = await place(OrderStatus.Confirmed);
    outbox.events.length = 0;

    moveTo(14);
    vi.spyOn(settlement, 'settle').mockResolvedValue();
    await sweeper.sweep();
    expect(orders.rows.find((row) => row.id === pending)?.status).toBe(OrderStatus.Pending);

    moveTo(16);
    await sweeper.sweep();
    for (const id of [pending, reserved]) {
      expect(orders.rows.find((row) => row.id === id)).toMatchObject({
        status: OrderStatus.Cancelled,
        cancelReason: CancelReason.ReservationTimeout,
      });
    }
    expect(orders.rows.find((row) => row.id === confirmed)?.status).toBe(OrderStatus.Confirmed);
    expect(outbox.events.map((event) => event.type)).toEqual([
      EventType.OrderCancelled,
      EventType.OrderCancelled,
    ]);
  });

  it('charges RESERVED orders again after a minute', async () => {
    const id = await place(OrderStatus.Reserved);
    moveTo(2);

    await sweeper.sweep();

    expect(orders.rows.find((row) => row.id === id)).toMatchObject({
      status: OrderStatus.Confirmed,
      payment: expect.objectContaining({ status: PaymentStatus.Succeeded }),
    });
  });

  it('keeps going when one retry fails, and skips when another pod holds the lock', async () => {
    await place(OrderStatus.Reserved);
    await place(OrderStatus.Reserved);
    moveTo(2);
    const settle = vi
      .spyOn(settlement, 'settle')
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue();

    expect(await sweeper.sweep()).toBe(true);
    expect(settle).toHaveBeenCalledTimes(2);

    let skipped: boolean | undefined;
    await lock.runExclusive('order:sweeper', 1000, async () => {
      skipped = await sweeper.sweep();
    });
    expect(skipped).toBe(false);
  });
});
