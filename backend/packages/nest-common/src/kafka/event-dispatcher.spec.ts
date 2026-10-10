import {
  DELIVERY_ATTEMPT_HEADER,
  type EventEnvelope,
  EventFactory,
  EventType,
} from '@bazaar/contracts';
import type { PinoLogger } from 'nestjs-pino';

import { ERROR_HEADER } from '../constants/kafka-header.constant.js';
import type { IncomingMessage, OutgoingMessage } from '../interfaces/kafka-message.interface.js';

import { BaseEventHandler } from './base-event-handler.js';
import { EventDispatcher } from './event-dispatcher.js';
import { MessagePublisher } from './message-publisher.js';
import { ProcessedEventStore } from './processed-event-store.js';
import { RetryPolicy } from './retry-policy.js';

class InMemoryProcessedEvents extends ProcessedEventStore<null> {
  public readonly seen = new Set<string>();

  public async runOnce(eventId: string, work: (tx: null) => Promise<void>): Promise<boolean> {
    if (this.seen.has(eventId)) {
      return false;
    }
    await work(null);
    this.seen.add(eventId);
    return true;
  }
}

class StockReservedHandler extends BaseEventHandler<EventType.StockReserved, null> {
  public readonly eventType = EventType.StockReserved;
  public readonly processed: string[] = [];
  public failWith: Error | null = null;

  public constructor(store: InMemoryProcessedEvents) {
    super(store);
  }

  protected process(event: EventEnvelope<EventType.StockReserved>): Promise<void> {
    if (this.failWith !== null) {
      return Promise.reject(this.failWith);
    }
    this.processed.push(event.payload.orderId);
    return Promise.resolve();
  }
}

class RecordingPublisher extends MessagePublisher {
  public readonly sent: OutgoingMessage[] = [];

  public send(message: OutgoingMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

const silentLogger = { warn: vi.fn() } as unknown as PinoLogger;

const toMessage = (value: unknown, headers: Record<string, string> = {}): IncomingMessage => ({
  topic: 'inventory.events',
  key: 'order-1',
  value: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
  headers,
});

describe('EventDispatcher', () => {
  let store: InMemoryProcessedEvents;
  let handler: StockReservedHandler;
  let publisher: RecordingPublisher;
  let dispatcher: EventDispatcher;
  const event = EventFactory.create({
    type: EventType.StockReserved,
    aggregateId: 'order-1',
    payload: { orderId: 'order-1' },
  });

  beforeEach(() => {
    store = new InMemoryProcessedEvents();
    handler = new StockReservedHandler(store);
    publisher = new RecordingPublisher();
    dispatcher = new EventDispatcher([handler], publisher, new RetryPolicy(3), silentLogger);
  });

  it('runs the handler registered for the event type', async () => {
    await dispatcher.dispatch(toMessage(event));

    expect(handler.processed).toEqual(['order-1']);
    expect(publisher.sent).toEqual([]);
  });

  it('processes a redelivered event only once', async () => {
    await dispatcher.dispatch(toMessage(event));
    await dispatcher.dispatch(toMessage(event));

    expect(handler.processed).toEqual(['order-1']);
  });

  it('ignores event types this service does not handle', async () => {
    const other = EventFactory.create({
      type: EventType.OrderPaid,
      aggregateId: 'order-1',
      payload: { orderId: 'order-1', paymentId: 'pay-1', amountUsdCents: 100 },
    });

    await dispatcher.dispatch(toMessage(other));

    expect(handler.processed).toEqual([]);
    expect(publisher.sent).toEqual([]);
  });

  it('sends a failing event to the retry topic with the next attempt number', async () => {
    handler.failWith = new Error('database down');

    await dispatcher.dispatch(toMessage(event));

    expect(publisher.sent).toEqual([
      expect.objectContaining({
        topic: 'inventory.events.retry',
        key: 'order-1',
        headers: { [DELIVERY_ATTEMPT_HEADER]: '2', [ERROR_HEADER]: 'database down' },
      }),
    ]);
  });

  it('sends a failing event to the dead-letter topic after the last attempt', async () => {
    handler.failWith = new Error('still down');

    await dispatcher.dispatch(toMessage(event, { [DELIVERY_ATTEMPT_HEADER]: '3' }));

    expect(publisher.sent[0]?.topic).toBe('inventory.events.dlq');
  });

  it('sends an event that breaks its contract straight to the dead-letter topic', async () => {
    await dispatcher.dispatch(toMessage('{"not":"an event"}'));

    expect(publisher.sent[0]?.topic).toBe('inventory.events.dlq');
    expect(publisher.sent[0]?.headers[ERROR_HEADER]).toBe('Invalid event envelope');
  });
});
