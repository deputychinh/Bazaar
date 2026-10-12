import { CancelReason, EventFactory, EventType } from '@bazaar/contracts';
import { firstValueFrom, take, toArray } from 'rxjs';

import { LiveOrderHandler } from './live-order.handler.js';
import { OrderStreamController } from './order-stream.controller.js';
import { OrderStreamHub } from './order-stream.hub.js';

const shopper = { id: 'shopper-1', email: 's@bazaar.test', role: 'SHOPPER' } as never;

describe('live order stream', () => {
  it('sends each shopper only their own order events', async () => {
    const hub = new OrderStreamHub();
    const mine = firstValueFrom(
      new OrderStreamController(hub).stream(shopper).pipe(take(2), toArray()),
    );

    await new LiveOrderHandler(EventType.OrderPaid, hub).handle(
      EventFactory.create({
        type: EventType.OrderPaid,
        aggregateId: 'o1',
        payload: { orderId: 'o1', shopperId: 'shopper-1', paymentId: 'p', amountUsdCents: 1 },
      }),
    );
    await new LiveOrderHandler(EventType.OrderCancelled, hub).handle(
      EventFactory.create({
        type: EventType.OrderCancelled,
        aggregateId: 'o2',
        payload: {
          orderId: 'o2',
          shopperId: 'someone-else',
          reason: CancelReason.OutOfStock,
          lines: [],
        },
      }),
    );
    await new LiveOrderHandler(EventType.SellerOrderShipped, hub).handle(
      EventFactory.create({
        type: EventType.SellerOrderShipped,
        aggregateId: 'o3',
        payload: { orderId: 'o3', sellerOrderId: 'so', sellerId: 'se', shopperId: 'shopper-1' },
      }),
    );

    const events = await mine;
    expect(
      events.map((event) => [event.type, (event.data as { orderId: string }).orderId]),
    ).toEqual([
      ['order', 'o1'],
      ['order', 'o3'],
    ]);
    expect(events[0]?.data).toMatchObject({ type: EventType.OrderPaid });
  });

  it('pings idle connections', async () => {
    vi.useFakeTimers();
    const first = firstValueFrom(new OrderStreamHub().stream('anyone'));
    await vi.advanceTimersByTimeAsync(25_000);
    expect(await first).toEqual({ type: 'ping', data: '' });
    vi.useRealTimers();
  });
});
