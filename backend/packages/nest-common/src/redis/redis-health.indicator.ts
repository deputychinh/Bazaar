import { Injectable } from '@nestjs/common';

import { HealthIndicator } from '../health/health-indicator.js';

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
