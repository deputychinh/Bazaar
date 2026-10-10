import { type Topic, TopicUtil } from '@bazaar/contracts';
import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';

import type { IncomingMessage } from '../interfaces/kafka-message.interface.js';

import type { BaseEventHandler } from './base-event-handler.js';
import { EventDispatcherFactory } from './event-dispatcher.factory.js';
import { KafkaConnection } from './kafka-connection.js';

export interface ConsumeOptions {
  groupId: string;
  topics: Topic[];
  handlers: BaseEventHandler[];
}

/** Runs consumer groups; each listens to its topics and their retry topics. */
@Injectable()
export class EventConsumer implements OnApplicationShutdown {
  private readonly consumers: KafkaJS.Consumer[] = [];

  public constructor(
    private readonly connection: KafkaConnection,
    private readonly dispatcherFactory: EventDispatcherFactory,
  ) {}

  public async start(options: ConsumeOptions): Promise<void> {
    const consumer = this.connection.createConsumer(options.groupId);
    const dispatcher = this.dispatcherFactory.create(options.handlers);
    this.consumers.push(consumer);
    await consumer.connect();
    await consumer.subscribe({
      topics: options.topics.flatMap((topic) => [topic, TopicUtil.retryTopic(topic)]),
    });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        await dispatcher.dispatch(this.toIncoming(topic, message));
      },
    });
  }

  public async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.consumers.map((consumer) => consumer.disconnect()));
  }

  private toIncoming(topic: string, message: KafkaJS.Message): IncomingMessage {
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(message.headers ?? {})) {
      if (value !== undefined) {
        headers[name] = value.toString();
      }
    }
    const value = typeof message.value === 'string' ? Buffer.from(message.value) : message.value;
    return { topic, key: message.key?.toString() ?? null, value, headers };
  }
}
