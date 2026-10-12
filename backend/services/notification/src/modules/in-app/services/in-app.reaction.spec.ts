import { CancelReason, EventFactory, EventType, NotificationKind } from '@bazaar/contracts';

import {
  InMemoryNotificationsRepository,
  InMemoryOrderSummariesRepository,
  NO_TRANSACTION,
} from '../../../../test/fakes/notification.fakes.js';
import { OrderSummaryReaction } from '../../order-summaries/services/order-summary.reaction.js';

import { InAppReaction } from './in-app.reaction.js';

const ORDER = '01990000-0000-7000-9000-0000000000cd';
const ref = { orderId: ORDER, sellerOrderId: 'so1', sellerId: 'seller-1', shopperId: 'shopper-1' };

describe('InAppReaction', () => {
  it('notifies the shopper and each seller for every order change', async () => {
    const notifications = new InMemoryNotificationsRepository();
    const summaries = new InMemoryOrderSummariesRepository();
    const reaction = new InAppReaction(notifications, summaries);
    await new OrderSummaryReaction(summaries).react(
      EventFactory.create({
        type: EventType.OrderCreated,
        aggregateId: ORDER,
        payload: {
          orderId: ORDER,
          shopperId: 'shopper-1',
          totalUsdCents: 3000,
          lines: [
            {
              sellerOrderId: 'so1',
              sellerId: 'seller-1',
              productId: 'p1',
              variantSku: 'A',
              quantity: 2,
              unitPriceUsdCents: 1500,
            },
          ],
        },
      }),
      NO_TRANSACTION,
    );

    const events = [
      EventFactory.create({
        type: EventType.OrderConfirmed,
        aggregateId: ORDER,
        payload: { orderId: ORDER, shopperId: 'shopper-1' },
      }),
      EventFactory.create({ type: EventType.SellerOrderShipped, aggregateId: ORDER, payload: ref }),
      EventFactory.create({
        type: EventType.SellerOrderDelivered,
        aggregateId: ORDER,
        payload: { ...ref, productIds: ['p1'] },
      }),
      EventFactory.create({
        type: EventType.SellerOrderCancelled,
        aggregateId: ORDER,
        payload: { ...ref, reason: CancelReason.ShopperCancelled, lines: [] },
      }),
      EventFactory.create({
        type: EventType.OrderCompleted,
        aggregateId: ORDER,
        payload: { orderId: ORDER, shopperId: 'shopper-1' },
      }),
      EventFactory.create({
        type: EventType.OrderCancelled,
        aggregateId: ORDER,
        payload: {
          orderId: ORDER,
          shopperId: 'shopper-1',
          reason: CancelReason.PaymentFailed,
          lines: [],
        },
      }),
      EventFactory.create({
        type: EventType.StockReserved,
        aggregateId: ORDER,
        payload: { orderId: ORDER },
      }),
    ];
    for (const event of events) await reaction.react(event, NO_TRANSACTION);

    expect(notifications.rows.map((row) => [row.userId, row.kind])).toEqual([
      ['shopper-1', NotificationKind.OrderConfirmed],
      ['seller-1', NotificationKind.NewSellerOrder],
      ['shopper-1', NotificationKind.SellerOrderShipped],
      ['shopper-1', NotificationKind.SellerOrderDelivered],
      ['seller-1', NotificationKind.SellerOrderCancelled],
      ['shopper-1', NotificationKind.OrderCompleted],
      ['shopper-1', NotificationKind.OrderCancelled],
    ]);
    expect(notifications.rows[0]?.data).toEqual({
      orderId: ORDER,
      orderReference: '000000CD',
      amountUsdCents: 3000,
    });
    expect(notifications.rows[1]?.data.amountUsdCents).toBe(3000);
    expect(notifications.rows[6]?.data.cancelReason).toBe(CancelReason.PaymentFailed);
  });

  it('still notifies the shopper when the order summary is unknown', async () => {
    const notifications = new InMemoryNotificationsRepository();
    await new InAppReaction(notifications, new InMemoryOrderSummariesRepository()).react(
      EventFactory.create({
        type: EventType.OrderConfirmed,
        aggregateId: 'o9',
        payload: { orderId: 'o9', shopperId: 'u9' },
      }),
      NO_TRANSACTION,
    );
    expect(notifications.rows).toHaveLength(1);
    expect(notifications.rows[0]?.data).not.toHaveProperty('amountUsdCents');
  });
});
