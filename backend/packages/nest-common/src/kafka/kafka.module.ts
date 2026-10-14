import { MAX_DELIVERY_ATTEMPTS } from '@bazaar/contracts';
import { type DynamicModule, Module } from '@nestjs/common';

import type { BaseEnv } from '../config/base-env.schema.js';
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
  /** Connection settings from the shared environment variables (base-env.schema). */
  public static optionsFromEnv(env: BaseEnv): KafkaModuleOptions {
    const { KAFKA_SASL_USERNAME: username, KAFKA_SASL_PASSWORD: password } = env;
    return {
      clientId: env.SERVICE_NAME,
      brokers: env.KAFKA_BROKERS,
      ssl: env.KAFKA_SSL,
      ...(username === undefined || password === undefined
        ? {}
        : { sasl: { mechanism: env.KAFKA_SASL_MECHANISM, username, password } }),
    };
  }

  public static forRootFromEnv(env: BaseEnv): DynamicModule {
    return KafkaModule.forRoot(KafkaModule.optionsFromEnv(env));
  }

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
