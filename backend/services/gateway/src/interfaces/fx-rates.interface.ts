import type { DisplayCurrency } from '@bazaar/contracts';

/** How many units of each display currency one US dollar buys. */
export interface FxRates {
  base: DisplayCurrency.Usd;
  rates: Record<DisplayCurrency, number>;
  fetchedAt: string;
  source: string;
}

export interface CachedFxRates {
  rates: FxRates;
  isFresh: boolean;
}
