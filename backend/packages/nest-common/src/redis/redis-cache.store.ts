import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PromiseUtil } from '../utils/promise.util.js';

import { CacheStore } from './cache-store.js';
import { RedisService } from './redis.service.js';

/** JSON values in Redis with a TTL. If Redis fails, it loads from the source instead. */
@Injectable()
export class RedisCacheStore extends CacheStore {
  public constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(RedisCacheStore.name);
  }

  public async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.attempt(() => this.redis.client.get(key));
    if (typeof cached === 'string') {
      return JSON.parse(cached) as T;
    }
    const value = await load();
    await this.attempt(() => this.redis.client.set(key, JSON.stringify(value), { EX: ttlSeconds }));
    return value;
  }

  public async delete(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.attempt(() => this.redis.client.del(keys));
    }
  }

  private async attempt<T>(operation: () => Promise<T>): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        { reason: PromiseUtil.errorMessage(error) },
        'cache unavailable, using the source',
      );
      return undefined;
    }
  }
}
