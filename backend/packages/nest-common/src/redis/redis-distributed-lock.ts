import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { DistributedLock } from './distributed-lock.js';
import { RedisService } from './redis.service.js';

/** Deletes the key only if it still holds our token (a lock that expired is never stolen back). */
const RELEASE_IF_OWNER = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

/** Single-instance Redis lock: SET NX PX with a random token, released by compare-and-delete. */
@Injectable()
export class RedisDistributedLock extends DistributedLock {
  public constructor(private readonly redis: RedisService) {
    super();
  }

  public async runExclusive(
    key: string,
    ttlMs: number,
    work: () => Promise<void>,
  ): Promise<boolean> {
    const token = randomUUID();
    const acquired = await this.redis.client.set(key, token, {
      condition: 'NX',
      expiration: { type: 'PX', value: ttlMs },
    });
    if (acquired !== 'OK') return false;
    try {
      await work();
    } finally {
      await this.redis.client.eval(RELEASE_IF_OWNER, { keys: [key], arguments: [token] });
    }
    return true;
  }
}
