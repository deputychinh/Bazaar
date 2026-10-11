import type { CachedFxRates, FxRates } from '../../../interfaces/fx-rates.interface.js';

/** Port: keeps the last good rates forever and remembers whether they are still fresh. */
export abstract class FxRateCache {
  public abstract read(): Promise<CachedFxRates | null>;

  public abstract write(rates: FxRates): Promise<void>;
}
