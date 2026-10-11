import { DisplayCurrency, Locale } from '@/api/gateway.schema';

export const CURRENCY_COOKIE = 'bazaar_currency';
export const CURRENCY_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 3600;
export const CENTS_PER_USD = 100;
/** Display currency before the visitor chooses one (ADR 0012). */
export const DEFAULT_CURRENCY: Readonly<Record<Locale, DisplayCurrency>> = {
  [Locale.en]: DisplayCurrency.USD,
  [Locale.vi]: DisplayCurrency.VND,
};
