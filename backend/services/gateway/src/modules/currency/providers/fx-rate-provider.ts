import type { FxRates } from '../../../interfaces/fx-rates.interface.js';

/** Port: where exchange rates come from (plan §2B Currency, ADR 0012). */
export abstract class FxRateProvider {
  public abstract fetchRates(): Promise<FxRates>;
}
