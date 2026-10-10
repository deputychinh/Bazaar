import { EVENT_SCHEMA_VERSION } from '../constants/kafka.constant.js';
import { EventType } from '../enums/event-type.enum.js';

import { EventFactory } from './event-factory.js';

describe('EventFactory', () => {
  it('fills id, version, time and an empty trace id by default', () => {
    const event = EventFactory.create({
      type: EventType.OrderConfirmed,
      aggregateId: 'order-1',
      payload: { orderId: 'order-1', shopperId: 'user-1' },
    });

    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.version).toBe(EVENT_SCHEMA_VERSION);
    expect(Number.isNaN(Date.parse(event.occurredAt))).toBe(false);
    expect(event.traceId).toBeNull();
    expect(event.payload).toEqual({ orderId: 'order-1', shopperId: 'user-1' });
  });

  it('uses the given id, time and trace id', () => {
    const occurredAt = new Date('2026-10-11T08:00:00.000Z');

    const event = EventFactory.create({
      type: EventType.StockReserved,
      aggregateId: 'order-2',
      payload: { orderId: 'order-2' },
      eventId: '0199d6b2-7c1e-7000-8000-000000000001',
      occurredAt,
      traceId: 'trace-1',
    });

    expect(event.eventId).toBe('0199d6b2-7c1e-7000-8000-000000000001');
    expect(event.occurredAt).toBe('2026-10-11T08:00:00.000Z');
    expect(event.traceId).toBe('trace-1');
  });
});
