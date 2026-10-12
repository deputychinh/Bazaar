import { KafkaJS } from '@confluentinc/kafka-javascript';
import { Inject, Injectable } from '@nestjs/common';

import { KAFKA_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { KafkaModuleOptions } from '../interfaces/kafka-module-options.interface.js';

/** The only file that knows which Kafka client library is used (plan §5.2). */
@Injectable()
export class KafkaConnection {
  private readonly kafka: KafkaJS.Kafka;

  public constructor(@Inject(KAFKA_MODULE_OPTIONS) options: KafkaModuleOptions) {
    this.kafka = new KafkaJS.Kafka({
      kafkaJS: { clientId: options.clientId, brokers: options.brokers },
    });
  }

  public createProducer(): KafkaJS.Producer {
    return this.kafka.producer({ kafkaJS: { idempotent: true, acks: -1 } });
  }

  public createConsumer(groupId: string, fromBeginning = true): KafkaJS.Consumer {
    return this.kafka.consumer({ kafkaJS: { groupId, fromBeginning } });
  }

  public createAdmin(): KafkaJS.Admin {
    return this.kafka.admin();
  }
}
