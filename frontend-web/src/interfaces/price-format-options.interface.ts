import type { DisplayCurrency, Locale } from '@/api/gateway.schema';

export interface PriceFormatOptions {
  usdCents: number;
  currency: DisplayCurrency;
  locale: Locale;
  /** VND per USD; null when rates are unavailable (prices then stay in USD). */
  usdToVnd: number | null;
}
