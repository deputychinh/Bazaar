import type { DisplayCurrency, Locale } from '@/api/gateway.schema';

export interface CurrencyContextValue {
  currency: DisplayCurrency;
  locale: Locale;
  usdToVnd: number | null;
  choose: (currency: DisplayCurrency) => void;
}
