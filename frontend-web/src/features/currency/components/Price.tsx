'use client';

import type { ReactElement } from 'react';

import { cx } from '@/utils/cx.util';
import { formatPrice } from '@/utils/money.util';

import { useCurrency } from '../useCurrency';

import './Price.css';

interface PriceProps {
  usdCents: number;
  isLarge?: boolean;
}

export const Price = ({ usdCents, isLarge = false }: PriceProps): ReactElement => {
  const { currency, locale, usdToVnd } = useCurrency();
  return (
    <span className={cx('price', isLarge && 'price--large')}>
      {formatPrice({ usdCents, currency, locale, usdToVnd })}
    </span>
  );
};
