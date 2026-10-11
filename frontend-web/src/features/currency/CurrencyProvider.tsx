'use client';

import {
  createContext,
  type ReactElement,
  type ReactNode,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { Locale } from '@/api/gateway.schema';
import { DEFAULT_CURRENCY } from '@/constants/currency.constant';
import type { CurrencyContextValue } from '@/interfaces/currency-context.interface';

import { readStoredCurrency, storeCurrency, subscribeToCurrency } from './currency-store';

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  locale: Locale;
  usdToVnd: number | null;
  children: ReactNode;
}

/**
 * Server render uses the locale's default currency (cacheable HTML); after hydration the visitor's
 * saved choice takes over (ADR 0012).
 */
export const CurrencyProvider = ({
  locale,
  usdToVnd,
  children,
}: CurrencyProviderProps): ReactElement => {
  const stored = useSyncExternalStore(subscribeToCurrency, readStoredCurrency, () => null);
  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency: stored ?? DEFAULT_CURRENCY[locale],
      locale,
      usdToVnd,
      choose: storeCurrency,
    }),
    [stored, locale, usdToVnd],
  );
  return <CurrencyContext value={value}>{children}</CurrencyContext>;
};
