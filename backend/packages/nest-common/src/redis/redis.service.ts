import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

import { REDIS_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { RedisModuleOptions } from '../interfaces/redis-module-options.interface.js';

/** One Redis connection per service: rate limits, cache, locks (plan §3.1). */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly client: ReturnType<typeof createClient>;

  public constructor(@Inject(REDIS_MODULE_OPTIONS) options: RedisModuleOptions) {
    this.client = createClient({ url: options.url });
  }

  public async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
