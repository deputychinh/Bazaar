import { DisplayCurrency, Locale } from '@/api/gateway.schema';
import { CENTS_PER_USD } from '@/constants/currency.constant';
import type { PriceFormatOptions } from '@/interfaces/price-format-options.interface';

const intlLocale = (locale: Locale): string => (locale === Locale.vi ? 'vi-VN' : 'en-US');

/**
 * USD as "$12.50"; VND as "≈ 315.000 ₫", rounded to whole đồng and marked approximate because
 * every amount is charged in USD (ADR 0012).
 */
export const formatPrice = ({
  usdCents,
  currency,
  locale,
  usdToVnd,
}: PriceFormatOptions): string => {
  if (currency === DisplayCurrency.VND && usdToVnd !== null) {
    const dong = Math.round((usdCents / CENTS_PER_USD) * usdToVnd);
    const formatted = new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: DisplayCurrency.VND,
      maximumFractionDigits: 0,
    }).format(dong);
    return `≈ ${formatted}`;
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: DisplayCurrency.USD,
  }).format(usdCents / CENTS_PER_USD);
};

/** Totals are added in USD cents first and converted once — never by adding rounded VND. */
export const sumUsdCents = (amounts: readonly number[]): number =>
  amounts.reduce((total, amount) => total + amount, 0);
