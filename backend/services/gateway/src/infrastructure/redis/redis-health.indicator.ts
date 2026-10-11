import { HealthIndicator } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  public readonly name = 'redis';

  public constructor(private readonly redis: RedisService) {
    super();
  }

  public async check(): Promise<void> {
    await this.redis.client.ping();
  }
}
