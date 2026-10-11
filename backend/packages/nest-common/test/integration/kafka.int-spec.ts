import { randomUUID } from 'node:crypto';

import {
  DELIVERY_ATTEMPT_HEADER,
  type EventEnvelope,
  EventFactory,
  EventType,
  MAX_DELIVERY_ATTEMPTS,
  Topic,
  TopicUtil,
} from '@bazaar/contracts';
import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  AppLoggerModule,
  BaseEventHandler,
  ERROR_HEADER,
  EventConsumer,
  EventProducer,
  KafkaConnection,
  KafkaModule,
  LogLevel,
  ProcessedEventStore,
} from '../../src/index.js';

const BROKERS = (process.env.KAFKA_BROKERS ?? '127.0.0.1:9094').split(',');

class InMemoryProcessedEvents extends ProcessedEventStore<null> {
  private readonly seen = new Set<string>();

  public async runOnce(eventId: string, work: (tx: null) => Promise<void>): Promise<boolean> {
    if (this.seen.has(eventId)) {
      return false;
    }
    await work(null);
    this.seen.add(eventId);
    return true;
  }
}

class ConfirmedHandler extends BaseEventHandler<EventType.OrderConfirmed, null> {
  public readonly eventType = EventType.OrderConfirmed;
  public readonly received: EventEnvelope<EventType.OrderConfirmed>[] = [];

  public constructor() {
    super(new InMemoryProcessedEvents());
  }

  protected process(event: EventEnvelope<EventType.OrderConfirmed>): Promise<void> {
    this.received.push(event);
    return Promise.resolve();
  }
}

class AlwaysFailingCompletedHandler extends BaseEventHandler<EventType.OrderCompleted, null> {
  public readonly eventType = EventType.OrderCompleted;
  /** Attempts per order id — the topic also holds events from earlier runs. */
  public readonly attempts = new Map<string, number>();

  public constructor() {
    super(new InMemoryProcessedEvents());
  }

  protected process(event: EventEnvelope<EventType.OrderCompleted>): Promise<void> {
    this.attempts.set(event.aggregateId, (this.attempts.get(event.aggregateId) ?? 0) + 1);
    return Promise.reject(new Error('warehouse offline'));
  }
}

const waitFor = async (condition: () => boolean, timeoutMs = 60_000): Promise<void> => {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

describe('Kafka (real broker)', () => {
  const runId = randomUUID();
  const confirmed = new ConfirmedHandler();
  const failing = new AlwaysFailingCompletedHandler();
  const deadLetters: KafkaJS.Message[] = [];
  let moduleRef: TestingModule;
  let dlqConsumer: KafkaJS.Consumer;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        AppLoggerModule.forRoot({ serviceName: 'it', level: LogLevel.Silent, pretty: false }),
        KafkaModule.forRoot({ clientId: `nest-common-it-${runId}`, brokers: BROKERS }),
      ],
    }).compile();
    await moduleRef.init();

    await moduleRef.get(EventConsumer).start({
      groupId: `nest-common-it-${runId}`,
      topics: [Topic.OrderEvents],
      handlers: [confirmed, failing],
    });

    dlqConsumer = moduleRef.get(KafkaConnection).createConsumer(`nest-common-it-dlq-${runId}`);
    await dlqConsumer.connect();
    await dlqConsumer.subscribe({ topics: [TopicUtil.dlqTopic(Topic.OrderEvents)] });
    await dlqConsumer.run({
      eachMessage: ({ message }) => {
        if (message.key?.toString().startsWith(runId)) {
          deadLetters.push(message);
        }
        return Promise.resolve();
      },
    });
  });

  afterAll(async () => {
    await dlqConsumer.disconnect();
    await moduleRef.close();
  });

  it('delivers a published event to its handler exactly once', async () => {
    const orderId = `${runId}-confirmed`;
    const event = EventFactory.create({
      type: EventType.OrderConfirmed,
      aggregateId: orderId,
      payload: { orderId, shopperId: 'shopper-1' },
      traceId: 'trace-it',
    });

    await moduleRef.get(EventProducer).publish(event);
    await waitFor(() => confirmed.received.some((received) => received.aggregateId === orderId));

    const matches = confirmed.received.filter((received) => received.aggregateId === orderId);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(event);
  });

  it('retries a failing event, then parks it on the dead-letter topic', async () => {
    const orderId = `${runId}-completed`;
    await moduleRef.get(EventProducer).publish(
      EventFactory.create({
        type: EventType.OrderCompleted,
        aggregateId: orderId,
        payload: { orderId, shopperId: 'shopper-1' },
      }),
    );

    await waitFor(() => deadLetters.length > 0, 90_000);

    expect(failing.attempts.get(orderId)).toBe(MAX_DELIVERY_ATTEMPTS);
    const headers = deadLetters[0]?.headers ?? {};
    expect(headers[DELIVERY_ATTEMPT_HEADER]?.toString()).toBe(String(MAX_DELIVERY_ATTEMPTS));
    expect(headers[ERROR_HEADER]?.toString()).toBe('warehouse offline');
  });
});
