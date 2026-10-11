import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

import { AppConfig } from '../../config/app-config.js';

/** Shared Redis connection: rate limits, cache, locks (plan §3.1). */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly client: ReturnType<typeof createClient>;

  public constructor(config: AppConfig) {
    this.client = createClient({ url: config.env.REDIS_URL });
  }

  public async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
