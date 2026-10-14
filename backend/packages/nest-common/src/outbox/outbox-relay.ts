import { Injectable, type OnApplicationShutdown, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { OUTBOX_BATCH_SIZE, OUTBOX_POLL_INTERVAL_MS } from '../constants/outbox.constant.js';
import { MessagePublisher } from '../kafka/message-publisher.js';
import { MetricsRegistry } from '../metrics/metrics.registry.js';

import { OutboxStore } from './outbox-store.js';

/** Publishes committed outbox rows to Kafka, in order, then marks them sent. */
@Injectable()
export class OutboxRelay implements OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;
  private isRunning = false;

  public constructor(
    private readonly store: OutboxStore,
    private readonly publisher: MessagePublisher,
    private readonly logger: PinoLogger,
    @Optional() metrics?: MetricsRegistry,
  ) {
    this.logger.setContext(OutboxRelay.name);
    this.registerMetrics(metrics);
  }

  /** Publishes one batch; returns how many messages were sent. */
  public async relayBatch(): Promise<number> {
    const messages = await this.store.fetchUnsent(OUTBOX_BATCH_SIZE);
    const sentIds: string[] = [];
    try {
      for (const message of messages) {
        await this.publisher.send({
          topic: message.topic,
          key: message.key,
          value: message.value,
          headers: message.headers,
        });
        sentIds.push(message.id);
      }
    } finally {
      if (sentIds.length > 0) {
        await this.store.markSent(sentIds);
      }
    }
    return sentIds.length;
  }

  public start(intervalMs = OUTBOX_POLL_INTERVAL_MS): void {
    this.isRunning = true;
    this.schedule(intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    clearTimeout(this.timer);
  }

  public onApplicationShutdown(): void {
    this.stop();
  }

  private schedule(intervalMs: number): void {
    this.timer = setTimeout(() => void this.tick(intervalMs), intervalMs);
  }

  private async tick(intervalMs: number): Promise<void> {
    let sent = 0;
    try {
      sent = await this.relayBatch();
    } catch (error) {
      this.logger.error({ err: error }, 'outbox relay batch failed');
    }
    if (!this.isRunning) {
      return;
    }
    // A full batch means more rows are waiting: run again right away.
    this.schedule(sent === OUTBOX_BATCH_SIZE ? 0 : intervalMs);
  }

  /** Backlog gauges, read from the store at scrape time. */
  private registerMetrics(metrics?: MetricsRegistry): void {
    if (metrics === undefined) return;
    const store = this.store;
    metrics.gauge({
      name: 'outbox_backlog_messages',
      help: 'Outbox messages not yet sent to Kafka',
      collect: async function () {
        this.set((await store.backlog()).count);
      },
    });
    metrics.gauge({
      name: 'outbox_oldest_unsent_age_seconds',
      help: 'Age of the oldest unsent outbox message (0 when empty)',
      collect: async function () {
        const { oldestCreatedAt } = await store.backlog();
        this.set(oldestCreatedAt === null ? 0 : (Date.now() - oldestCreatedAt.getTime()) / 1000);
      },
    });
  }
}
