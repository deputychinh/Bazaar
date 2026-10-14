import type { Counter } from 'prom-client';

import type { ConsumeOutcome } from '../enums/consume-outcome.enum.js';

import type { MetricsRegistry } from './metrics.registry.js';

/** Kafka throughput and failures; a no-op when the service has no MetricsModule (tests). */
export class KafkaMetrics {
  private readonly produced?: Counter;
  private readonly consumed?: Counter;

  public constructor(registry?: MetricsRegistry) {
    this.produced = registry?.counter({
      name: 'kafka_messages_produced_total',
      help: 'Messages sent to Kafka by topic and result',
      labelNames: ['topic', 'result'],
    });
    this.consumed = registry?.counter({
      name: 'kafka_messages_consumed_total',
      help: 'Messages consumed from Kafka by topic and outcome',
      labelNames: ['topic', 'outcome'],
    });
  }

  public recordProduced(topic: string, succeeded: boolean): void {
    this.produced?.inc({ topic, result: succeeded ? 'ok' : 'error' });
  }

  public recordConsumed(topic: string, outcome: ConsumeOutcome): void {
    this.consumed?.inc({ topic, outcome });
  }
}
