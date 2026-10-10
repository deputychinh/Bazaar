import type { PinoLogger } from 'nestjs-pino';

import { OUTBOX_BATCH_SIZE } from '../constants/outbox.constant.js';
import type { OutgoingMessage } from '../interfaces/kafka-message.interface.js';
import type { OutboxMessage } from '../interfaces/outbox-message.interface.js';
import { MessagePublisher } from '../kafka/message-publisher.js';

import { OutboxRelay } from './outbox-relay.js';
import { OutboxStore } from './outbox-store.js';

class InMemoryOutbox extends OutboxStore {
  public readonly sentIds: string[] = [];

  public constructor(public rows: OutboxMessage[]) {
    super();
  }

  public fetchUnsent(limit: number): Promise<OutboxMessage[]> {
    return Promise.resolve(
      this.rows.filter((row) => !this.sentIds.includes(row.id)).slice(0, limit),
    );
  }

  public markSent(ids: string[]): Promise<void> {
    this.sentIds.push(...ids);
    return Promise.resolve();
  }
}

class FlakyPublisher extends MessagePublisher {
  public readonly sent: OutgoingMessage[] = [];
  public failOnKey: string | null = null;

  public send(message: OutgoingMessage): Promise<void> {
    if (message.key === this.failOnKey) {
      return Promise.reject(new Error('broker unavailable'));
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}

const buildRow = (id: string): OutboxMessage => ({
  id,
  topic: 'order.events',
  key: id,
  value: `{"id":"${id}"}`,
  headers: {},
});

const logger = { setContext: vi.fn(), error: vi.fn() } as unknown as PinoLogger;

describe('OutboxRelay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes unsent rows in order and marks them sent', async () => {
    const outbox = new InMemoryOutbox([buildRow('a'), buildRow('b')]);
    const publisher = new FlakyPublisher();
    const relay = new OutboxRelay(outbox, publisher, logger);

    const sent = await relay.relayBatch();

    expect(sent).toBe(2);
    expect(publisher.sent.map((message) => message.key)).toEqual(['a', 'b']);
    expect(outbox.sentIds).toEqual(['a', 'b']);
  });

  it('marks only the rows published before a failure, then rethrows', async () => {
    const outbox = new InMemoryOutbox([buildRow('a'), buildRow('b'), buildRow('c')]);
    const publisher = new FlakyPublisher();
    publisher.failOnKey = 'b';
    const relay = new OutboxRelay(outbox, publisher, logger);

    await expect(relay.relayBatch()).rejects.toThrow('broker unavailable');

    expect(outbox.sentIds).toEqual(['a']);
  });

  it('keeps polling on an interval until stopped', async () => {
    vi.useFakeTimers();
    const outbox = new InMemoryOutbox([buildRow('a')]);
    const publisher = new FlakyPublisher();
    const relay = new OutboxRelay(outbox, publisher, logger);

    relay.start(100);
    await vi.advanceTimersByTimeAsync(100);
    outbox.rows.push(buildRow('b'));
    await vi.advanceTimersByTimeAsync(100);
    relay.onApplicationShutdown();
    outbox.rows.push(buildRow('c'));
    await vi.advanceTimersByTimeAsync(500);

    expect(publisher.sent.map((message) => message.key)).toEqual(['a', 'b']);
  });

  it('logs a failed batch and keeps running', async () => {
    vi.useFakeTimers();
    const outbox = new InMemoryOutbox([buildRow('a')]);
    const publisher = new FlakyPublisher();
    publisher.failOnKey = 'a';
    const relay = new OutboxRelay(outbox, publisher, logger);

    relay.start(100);
    await vi.advanceTimersByTimeAsync(100);
    publisher.failOnKey = null;
    await vi.advanceTimersByTimeAsync(100);
    relay.stop();

    expect(logger.error).toHaveBeenCalled();
    expect(publisher.sent.map((message) => message.key)).toEqual(['a']);
  });

  it('runs again immediately when a full batch was sent', async () => {
    vi.useFakeTimers();
    const rows = Array.from({ length: OUTBOX_BATCH_SIZE + 1 }, (_, index) => buildRow(`r${index}`));
    const outbox = new InMemoryOutbox(rows);
    const publisher = new FlakyPublisher();
    const relay = new OutboxRelay(outbox, publisher, logger);

    relay.start(1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    // Far less than the 1 s interval: proves the second batch did not wait for it.
    await vi.advanceTimersByTimeAsync(10);
    relay.stop();

    expect(publisher.sent).toHaveLength(OUTBOX_BATCH_SIZE + 1);
  });
});
