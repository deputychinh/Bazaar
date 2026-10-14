import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { KafkaMetrics } from '../metrics/kafka-metrics.js';

import type { BaseEventHandler } from './base-event-handler.js';
import { EventDispatcher } from './event-dispatcher.js';
import { MessagePublisher } from './message-publisher.js';
import { RetryPolicy } from './retry-policy.js';

/** Factory pattern: one dispatcher per consumer group, sharing publisher and retry policy. */
@Injectable()
export class EventDispatcherFactory {
  public constructor(
    private readonly publisher: MessagePublisher,
    private readonly retryPolicy: RetryPolicy,
    private readonly logger: PinoLogger,
    private readonly metrics: KafkaMetrics,
  ) {
    this.logger.setContext(EventDispatcher.name);
  }

  public create(handlers: readonly BaseEventHandler[]): EventDispatcher {
    return new EventDispatcher(
      handlers,
      this.publisher,
      this.retryPolicy,
      this.logger,
      this.metrics,
    );
  }
}
