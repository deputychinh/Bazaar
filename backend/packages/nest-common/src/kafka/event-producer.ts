import { type AnyEventEnvelope, EVENT_TOPIC, TRACE_ID_HEADER } from '@bazaar/contracts';
import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { SpanKind } from '@opentelemetry/api';

import type { OutgoingMessage } from '../interfaces/kafka-message.interface.js';
import { KafkaMetrics } from '../metrics/kafka-metrics.js';
import { TraceContext } from '../tracing/trace-context.js';

import { KafkaConnection } from './kafka-connection.js';
import { MessagePublisher } from './message-publisher.js';

/** Kafka adapter of MessagePublisher. Services publish through the outbox, not directly. */
@Injectable()
export class EventProducer extends MessagePublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly producer: KafkaJS.Producer;

  public constructor(
    connection: KafkaConnection,
    private readonly metrics: KafkaMetrics,
  ) {
    super();
    this.producer = connection.createProducer();
  }

  public async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.producer.disconnect();
  }

  public async publish(event: AnyEventEnvelope): Promise<void> {
    await this.send({
      topic: EVENT_TOPIC[event.type],
      key: event.aggregateId,
      value: JSON.stringify(event),
      headers: event.traceId === null ? {} : { [TRACE_ID_HEADER]: event.traceId },
    });
  }

  /**
   * Publishes inside a producer span that continues the trace stored with the message (outbox rows
   * keep the request's context) and hands the span's own context on in the headers.
   */
  public async send(message: OutgoingMessage): Promise<void> {
    await TraceContext.inSpan(`${message.topic} publish`, () => this.sendNow(message), {
      kind: SpanKind.PRODUCER,
      parent: message.headers,
      attributes: { 'messaging.system': 'kafka', 'messaging.destination.name': message.topic },
    });
  }

  private async sendNow(message: OutgoingMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: message.topic,
        messages: [
          {
            key: message.key,
            value: message.value,
            headers: { ...message.headers, ...TraceContext.headers() },
          },
        ],
      });
      this.metrics.recordProduced(message.topic, true);
    } catch (error) {
      this.metrics.recordProduced(message.topic, false);
      throw error;
    }
  }
}
