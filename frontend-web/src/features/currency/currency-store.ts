import { DisplayCurrency } from '@/api/gateway.schema';
import { CURRENCY_COOKIE, CURRENCY_COOKIE_MAX_AGE_SECONDS } from '@/constants/currency.constant';
import { cookieString, readCookie } from '@/utils/cookie.util';

// The chosen currency lives in a cookie; this tiny store lets React subscribe to it.
const listeners = new Set<() => void>();

export const subscribeToCurrency = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const readStoredCurrency = (): DisplayCurrency | null => {
  const value = readCookie(CURRENCY_COOKIE, document.cookie);
  return Object.values<string>(DisplayCurrency).includes(value ?? '')
    ? (value as DisplayCurrency)
    : null;
};

export const storeCurrency = (currency: DisplayCurrency): void => {
  document.cookie = cookieString(CURRENCY_COOKIE, currency, CURRENCY_COOKIE_MAX_AGE_SECONDS);
  listeners.forEach((listener) => listener());
};
