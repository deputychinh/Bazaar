'use client';

import type { ReactElement } from 'react';

import { cx } from '@/utils/cx.util';
import { formatPrice } from '@/utils/money.util';

import { useCurrency } from '../useCurrency';

import './Price.css';

interface PriceProps {
  usdCents: number;
  isLarge?: boolean;
  className?: string;
}

export const Price = ({ usdCents, isLarge = false, className }: PriceProps): ReactElement => {
  const { currency, locale, usdToVnd } = useCurrency();
  return (
    <span className={cx('price', isLarge && 'price--large', className)}>
      {formatPrice({ usdCents, currency, locale, usdToVnd })}
    </span>
  );
};
