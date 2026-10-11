import { DisplayCurrency } from '@bazaar/contracts';
import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AppConfig } from '../../../config/app-config.js';
import { FX_PROVIDER_TIMEOUT_MS } from '../../../constants/currency.constant.js';
import type { FxRates } from '../../../interfaces/fx-rates.interface.js';

import { FxRateProvider } from './fx-rate-provider.js';

/** Live rates from a public API that publishes USD → VND (answers `{ rates: { VND } }`). */
@Injectable()
export class HttpFxRateProvider extends FxRateProvider {
  private static readonly responseSchema = z.object({
    rates: z.object({ VND: z.number().positive() }),
  });

  public constructor(
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {
    super();
  }

  public async fetchRates(): Promise<FxRates> {
    const response = await fetch(this.config.env.FX_API_URL, {
      signal: AbortSignal.timeout(FX_PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`FX provider answered ${response.status}`);
    }
    const body = HttpFxRateProvider.responseSchema.parse(await response.json());
    return {
      base: DisplayCurrency.Usd,
      rates: { [DisplayCurrency.Usd]: 1, [DisplayCurrency.Vnd]: body.rates.VND },
      fetchedAt: this.clock.now().toISOString(),
      source: new URL(this.config.env.FX_API_URL).hostname,
    };
  }
}
