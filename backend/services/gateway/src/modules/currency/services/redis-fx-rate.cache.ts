import { RedisService } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import {
  FX_FRESH_CACHE_KEY,
  FX_FRESH_SECONDS,
  FX_LATEST_CACHE_KEY,
} from '../../../constants/currency.constant.js';
import type { CachedFxRates, FxRates } from '../../../interfaces/fx-rates.interface.js';

import { FxRateCache } from './fx-rate.cache.js';

/** `latest` never expires (stale fallback); `fresh` is a 1-hour marker. */
@Injectable()
export class RedisFxRateCache extends FxRateCache {
  public constructor(private readonly redis: RedisService) {
    super();
  }

  public async read(): Promise<CachedFxRates | null> {
    const [latest, fresh] = await Promise.all([
      this.redis.client.get(FX_LATEST_CACHE_KEY),
      this.redis.client.exists(FX_FRESH_CACHE_KEY),
    ]);
    return typeof latest === 'string'
      ? { rates: JSON.parse(latest) as FxRates, isFresh: fresh === 1 }
      : null;
  }

  public async write(rates: FxRates): Promise<void> {
    await this.redis.client
      .multi()
      .set(FX_LATEST_CACHE_KEY, JSON.stringify(rates))
      .set(FX_FRESH_CACHE_KEY, '1', { EX: FX_FRESH_SECONDS })
      .exec();
  }
}
