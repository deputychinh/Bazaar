import { DisplayCurrency } from '@bazaar/contracts';
import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../config/app-config.js';
import type { FxRates } from '../../../interfaces/fx-rates.interface.js';

import { FxRateProvider } from './fx-rate-provider.js';

@Injectable()
export class StaticFxRateProvider extends FxRateProvider {
  public constructor(
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {
    super();
  }

  public fetchRates(): Promise<FxRates> {
    return Promise.resolve({
      base: DisplayCurrency.Usd,
      rates: { [DisplayCurrency.Usd]: 1, [DisplayCurrency.Vnd]: this.config.env.FX_STATIC_USD_VND },
      fetchedAt: this.clock.now().toISOString(),
      source: 'static',
    });
  }
}
