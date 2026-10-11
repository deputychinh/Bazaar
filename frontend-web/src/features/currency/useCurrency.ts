import { use } from 'react';

import type { CurrencyContextValue } from '@/interfaces/currency-context.interface';

import { CurrencyContext } from './CurrencyProvider';

export const useCurrency = (): CurrencyContextValue => {
  const value = use(CurrencyContext);
  if (value === null) {
    throw new Error('useCurrency must be used inside <CurrencyProvider>');
  }
  return value;
};
