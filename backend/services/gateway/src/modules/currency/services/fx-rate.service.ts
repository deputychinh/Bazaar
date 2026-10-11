import { PromiseUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import type { FxRates } from '../../../interfaces/fx-rates.interface.js';
import { FxRateProvider } from '../providers/fx-rate-provider.js';
import { StaticFxRateProvider } from '../providers/static-fx-rate.provider.js';

import { FxRateCache } from './fx-rate.cache.js';

/** Fresh cached rates → provider → last good rates → configured static rate. Never fails. */
@Injectable()
export class FxRateService {
  public constructor(
    private readonly provider: FxRateProvider,
    private readonly fallback: StaticFxRateProvider,
    private readonly cache: FxRateCache,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FxRateService.name);
  }

  public async current(): Promise<FxRates> {
    const cached = await this.safely(() => this.cache.read());
    if (cached?.isFresh === true) {
      return cached.rates;
    }
    try {
      const rates = await this.provider.fetchRates();
      await this.safely(() => this.cache.write(rates));
      return rates;
    } catch (error) {
      this.logger.warn(
        { reason: PromiseUtil.errorMessage(error) },
        'FX provider failed, serving the last good rates',
      );
      return cached?.rates ?? this.fallback.fetchRates();
    }
  }

  private async safely<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn({ reason: PromiseUtil.errorMessage(error) }, 'FX cache unavailable');
      return null;
    }
  }
}
