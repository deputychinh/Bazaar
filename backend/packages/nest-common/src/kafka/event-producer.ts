import { type AnyEventEnvelope, EVENT_TOPIC, TRACE_ID_HEADER } from '@bazaar/contracts';
import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';

import type { OutgoingMessage } from '../interfaces/kafka-message.interface.js';
import { KafkaMetrics } from '../metrics/kafka-metrics.js';

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

  public async send(message: OutgoingMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: message.topic,
        messages: [{ key: message.key, value: message.value, headers: message.headers }],
      });
      this.metrics.recordProduced(message.topic, true);
    } catch (error) {
      this.metrics.recordProduced(message.topic, false);
      throw error;
    }
  }
}
