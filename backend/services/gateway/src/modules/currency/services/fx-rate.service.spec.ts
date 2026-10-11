import { DisplayCurrency } from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';
import type { PinoLogger } from 'nestjs-pino';

import { NOW, testConfig } from '../../../../test/fakes/auth.fakes.js';
import type { CachedFxRates, FxRates } from '../../../interfaces/fx-rates.interface.js';
import { FxRateProvider } from '../providers/fx-rate-provider.js';
import { StaticFxRateProvider } from '../providers/static-fx-rate.provider.js';

import { FxRateCache } from './fx-rate.cache.js';
import { FxRateService } from './fx-rate.service.js';

const live = (vnd: number): FxRates => ({
  base: DisplayCurrency.Usd,
  rates: { [DisplayCurrency.Usd]: 1, [DisplayCurrency.Vnd]: vnd },
  fetchedAt: NOW.toISOString(),
  source: 'test',
});

class ScriptedProvider extends FxRateProvider {
  public calls = 0;
  public next: FxRates | Error = live(25_500);

  public fetchRates(): Promise<FxRates> {
    this.calls += 1;
    return this.next instanceof Error ? Promise.reject(this.next) : Promise.resolve(this.next);
  }
}

class MemoryFxCache extends FxRateCache {
  public stored: CachedFxRates | null = null;
  public broken = false;

  public read(): Promise<CachedFxRates | null> {
    return this.broken ? Promise.reject(new Error('redis down')) : Promise.resolve(this.stored);
  }

  public write(rates: FxRates): Promise<void> {
    this.stored = { rates, isFresh: true };
    return Promise.resolve();
  }
}

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;

describe('FxRateService', () => {
  let provider: ScriptedProvider;
  let cache: MemoryFxCache;
  let service: FxRateService;

  beforeEach(() => {
    provider = new ScriptedProvider();
    cache = new MemoryFxCache();
    service = new FxRateService(
      provider,
      new StaticFxRateProvider(testConfig(), new FixedClock(NOW)),
      cache,
      logger,
    );
  });

  it('fetches once, then serves the fresh cached rates', async () => {
    await service.current();
    const second = await service.current();

    expect(second.rates[DisplayCurrency.Vnd]).toBe(25_500);
    expect(provider.calls).toBe(1);
  });

  it('refreshes stale rates from the provider', async () => {
    cache.stored = { rates: live(24_000), isFresh: false };

    expect((await service.current()).rates[DisplayCurrency.Vnd]).toBe(25_500);
  });

  it('serves the last good rates when the provider fails', async () => {
    cache.stored = { rates: live(24_000), isFresh: false };
    provider.next = new Error('provider down');

    expect((await service.current()).rates[DisplayCurrency.Vnd]).toBe(24_000);
  });

  it('falls back to the configured static rate when nothing is cached and the provider fails', async () => {
    provider.next = new Error('provider down');

    const rates = await service.current();

    expect(rates).toMatchObject({ source: 'static', rates: { [DisplayCurrency.Vnd]: 26_000 } });
  });

  it('keeps working when the cache itself is down', async () => {
    cache.broken = true;

    expect((await service.current()).rates[DisplayCurrency.Vnd]).toBe(25_500);
  });
});
