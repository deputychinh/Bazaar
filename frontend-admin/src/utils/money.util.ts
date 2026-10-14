import { CENTS_PER_USD } from '@/constants/money.constant';

/** "12.5" or "12,50" typed in a form → 1250 cents; null when it is not a valid amount. */
export const dollarsToCents = (value: string): number | null => {
  const normalised = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * CENTS_PER_USD);
};

export const centsToDollars = (cents: number): string => (cents / CENTS_PER_USD).toFixed(2);

/** USD amount in the reader's number format. */
export const formatUsd = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / CENTS_PER_USD);
