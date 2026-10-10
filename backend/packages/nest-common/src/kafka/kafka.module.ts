import { MAX_DELIVERY_ATTEMPTS } from '@bazaar/contracts';
import { type DynamicModule, Module } from '@nestjs/common';

import { KAFKA_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { KafkaModuleOptions } from '../interfaces/kafka-module-options.interface.js';

import { EventConsumer } from './event-consumer.js';
import { EventDispatcherFactory } from './event-dispatcher.factory.js';
import { EventProducer } from './event-producer.js';
import { KafkaConnection } from './kafka-connection.js';
import { MessagePublisher } from './message-publisher.js';
import { RetryPolicy } from './retry-policy.js';

@Module({})
export class KafkaModule {
  public static forRoot(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      global: true,
      providers: [
        { provide: KAFKA_MODULE_OPTIONS, useValue: options },
        { provide: RetryPolicy, useFactory: () => new RetryPolicy(MAX_DELIVERY_ATTEMPTS) },
        KafkaConnection,
        EventProducer,
        { provide: MessagePublisher, useExisting: EventProducer },
        EventDispatcherFactory,
        EventConsumer,
      ],
      exports: [KafkaConnection, EventProducer, MessagePublisher, EventConsumer],
    };
  }
}
