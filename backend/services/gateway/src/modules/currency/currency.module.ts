import { Module } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';
import { FxProviderKind } from '../../enums/fx-provider-kind.enum.js';

import { FxRatesController } from './controllers/fx-rates.controller.js';
import { FxRateProvider } from './providers/fx-rate-provider.js';
import { HttpFxRateProvider } from './providers/http-fx-rate.provider.js';
import { StaticFxRateProvider } from './providers/static-fx-rate.provider.js';
import { FxRateCache } from './services/fx-rate.cache.js';
import { FxRateService } from './services/fx-rate.service.js';
import { RedisFxRateCache } from './services/redis-fx-rate.cache.js';

@Module({
  controllers: [FxRatesController],
  providers: [
    FxRateService,
    StaticFxRateProvider,
    HttpFxRateProvider,
    {
      provide: FxRateProvider,
      inject: [AppConfig, HttpFxRateProvider, StaticFxRateProvider],
      useFactory: (config: AppConfig, http: HttpFxRateProvider, fixed: StaticFxRateProvider) =>
        config.env.FX_PROVIDER === FxProviderKind.Http ? http : fixed,
    },
    { provide: FxRateCache, useClass: RedisFxRateCache },
  ],
})
export class CurrencyModule {}
