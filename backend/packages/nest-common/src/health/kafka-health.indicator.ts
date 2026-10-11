import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';

import { KafkaConnection } from '../kafka/kafka-connection.js';

import { HealthIndicator } from './health-indicator.js';

/** Ready when the broker answers a metadata request. */
@Injectable()
export class KafkaHealthIndicator extends HealthIndicator implements OnApplicationShutdown {
  public readonly name = 'kafka';
  private readonly admin: KafkaJS.Admin;
  private isConnected = false;

  public constructor(connection: KafkaConnection) {
    super();
    this.admin = connection.createAdmin();
  }

  public async check(): Promise<void> {
    if (!this.isConnected) {
      await this.admin.connect();
      this.isConnected = true;
    }
    await this.admin.listTopics();
  }

  public async onApplicationShutdown(): Promise<void> {
    if (this.isConnected) {
      await this.admin.disconnect();
    }
  }
}
