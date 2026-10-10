import { CancelReason } from '../enums/cancel-reason.enum.js';
import { EventType } from '../enums/event-type.enum.js';
import { InvalidEventError } from '../errors/invalid-event.error.js';

import { EventFactory } from './event-factory.js';
import { EventParser } from './event-parser.js';

const buildOrderCreated = () =>
  EventFactory.create({
    type: EventType.OrderCreated,
    aggregateId: 'order-1',
    payload: {
      orderId: 'order-1',
      shopperId: 'user-1',
      totalUsdCents: 2500,
      lines: [
        {
          sellerOrderId: 'so-1',
          sellerId: 'seller-1',
          productId: 'product-1',
          variantSku: 'SKU-1',
          quantity: 2,
          unitPriceUsdCents: 1250,
        },
      ],
    },
  });

describe('EventParser', () => {
  it('returns a typed envelope for a valid JSON event', () => {
    const event = buildOrderCreated();

    const parsed = EventParser.parseJson(Buffer.from(JSON.stringify(event)));

    expect(parsed).toEqual(event);
    expect(parsed.type).toBe(EventType.OrderCreated);
  });

  it('rejects a value that is not JSON', () => {
    expect(() => EventParser.parseJson('not json')).toThrow(InvalidEventError);
  });

  it('rejects an unknown event type', () => {
    const event = { ...buildOrderCreated(), type: 'SomethingElse' };

    expect(() => EventParser.parse(event)).toThrow('Invalid event envelope');
  });

  it('rejects a payload that breaks its contract and lists the issues', () => {
    const event = EventFactory.create({
      type: EventType.OrderCancelled,
      aggregateId: 'order-1',
      payload: {
        orderId: 'order-1',
        shopperId: 'user-1',
        reason: CancelReason.OutOfStock,
        lines: [],
      },
    });
    const broken = { ...event, payload: { ...event.payload, reason: 'BORED' } };

    let error: unknown;
    try {
      EventParser.parse(broken);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidEventError);
    expect((error as InvalidEventError).issues).toEqual([expect.stringContaining('reason')]);
  });

  it('rejects money that is not whole cents', () => {
    const event = buildOrderCreated();
    const broken = { ...event, payload: { ...event.payload, totalUsdCents: 25.5 } };

    expect(() => EventParser.parse(broken)).toThrow('Invalid payload for OrderCreated');
  });
});
