import { CancelReason, EventFactory, EventType, Locale } from '@bazaar/contracts';

import {
  InMemoryContactsRepository,
  InMemoryEmailQueueRepository,
  InMemoryOrderSummariesRepository,
  NO_TRANSACTION,
  testConfig,
} from '../../../../test/fakes/notification.fakes.js';
import { OrderSummaryReaction } from '../../order-summaries/services/order-summary.reaction.js';

import { EmailReaction } from './email.reaction.js';

const ORDER = '01990000-0000-7000-9000-0000000000ab';

describe('EmailReaction', () => {
  let contacts: InMemoryContactsRepository;
  let summaries: InMemoryOrderSummariesRepository;
  let queue: InMemoryEmailQueueRepository;
  let reaction: EmailReaction;

  beforeEach(async () => {
    contacts = new InMemoryContactsRepository();
    summaries = new InMemoryOrderSummariesRepository();
    queue = new InMemoryEmailQueueRepository();
    reaction = new EmailReaction(contacts, summaries, queue, testConfig());
    await contacts.save({
      userId: 'shopper-1',
      email: 'linh@bazaar.test',
      preferredLocale: Locale.Vi,
    });
    await contacts.save({
      userId: 'seller-1',
      email: 'minh@bazaar.test',
      preferredLocale: Locale.En,
    });
    await new OrderSummaryReaction(summaries).react(
      EventFactory.create({
        type: EventType.OrderCreated,
        aggregateId: ORDER,
        payload: {
          orderId: ORDER,
          shopperId: 'shopper-1',
          totalUsdCents: 4500,
          lines: [
            {
              sellerOrderId: 'so1',
              sellerId: 'seller-1',
              productId: 'p1',
              variantSku: 'A',
              quantity: 2,
              unitPriceUsdCents: 1500,
            },
            {
              sellerOrderId: 'so2',
              sellerId: 'seller-unknown',
              productId: 'p2',
              variantSku: 'B',
              quantity: 1,
              unitPriceUsdCents: 1500,
            },
          ],
        },
      }),
      NO_TRANSACTION,
    );
  });

  it('sends the verification link to the address in the event, in its language', async () => {
    await reaction.react(
      EventFactory.create({
        type: EventType.EmailVerificationRequested,
        aggregateId: 'u9',
        payload: {
          userId: 'u9',
          email: 'new@bazaar.test',
          preferredLocale: Locale.En,
          link: 'https://bazaar.test/en/verify-email?token=t',
        },
      }),
      NO_TRANSACTION,
    );
    expect(queue.rows[0]).toMatchObject({
      to: 'new@bazaar.test',
      subject: 'Confirm your email for Bazaar',
    });
    expect(queue.rows[0]?.text).toContain('token=t');
  });

  it('on confirmation, mails the shopper the total and each known seller their share', async () => {
    await reaction.react(
      EventFactory.create({
        type: EventType.OrderConfirmed,
        aggregateId: ORDER,
        payload: { orderId: ORDER, shopperId: 'shopper-1' },
      }),
      NO_TRANSACTION,
    );

    expect(queue.rows.map((row) => [row.to, row.subject])).toEqual([
      ['linh@bazaar.test', 'Đơn hàng #000000AB đã được xác nhận'],
      ['minh@bazaar.test', 'New order #000000AB to fulfil'],
    ]);
    expect(queue.rows[0]?.text).toMatch(/3 sản phẩm, 45,00\sUS\$/);
    expect(queue.rows[0]?.text).toContain(`http://localhost:3100/vi/orders/${ORDER}`);
    expect(queue.rows[1]?.text).toContain('2 items, $30.00');
  });

  it('tells the shopper about cancellation, shipping and delivery', async () => {
    const ref = {
      orderId: ORDER,
      sellerOrderId: 'so1',
      sellerId: 'seller-1',
      shopperId: 'shopper-1',
    };
    await reaction.react(
      EventFactory.create({
        type: EventType.OrderCancelled,
        aggregateId: ORDER,
        payload: {
          orderId: ORDER,
          shopperId: 'shopper-1',
          reason: CancelReason.OutOfStock,
          lines: [],
        },
      }),
      NO_TRANSACTION,
    );
    await reaction.react(
      EventFactory.create({ type: EventType.SellerOrderShipped, aggregateId: ORDER, payload: ref }),
      NO_TRANSACTION,
    );
    await reaction.react(
      EventFactory.create({
        type: EventType.SellerOrderDelivered,
        aggregateId: ORDER,
        payload: { ...ref, productIds: ['p1'] },
      }),
      NO_TRANSACTION,
    );

    expect(queue.rows.map((row) => row.subject)).toEqual([
      'Đơn hàng #000000AB đã bị huỷ',
      'Một phần đơn hàng #000000AB đang được giao',
      'Đã giao: một phần đơn hàng #000000AB',
    ]);
  });

  it('skips users it has no contact for and events that need no email', async () => {
    await reaction.react(
      EventFactory.create({
        type: EventType.OrderConfirmed,
        aggregateId: 'o2',
        payload: { orderId: 'o2', shopperId: 'stranger' },
      }),
      NO_TRANSACTION,
    );
    await reaction.react(
      EventFactory.create({
        type: EventType.StockReserved,
        aggregateId: ORDER,
        payload: { orderId: ORDER },
      }),
      NO_TRANSACTION,
    );
    expect(queue.rows).toHaveLength(0);
  });
});
