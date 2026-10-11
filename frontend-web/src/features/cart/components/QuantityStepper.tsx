'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { MAX_LINE_QUANTITY } from '@/constants/cart.constant';

import './QuantityStepper.css';

interface QuantityStepperProps {
  value: number;
  max: number;
  /** Visible product name, so screen readers know which line the buttons change. */
  label: string;
  onChange: (quantity: number) => void;
}

export const QuantityStepper = ({
  value,
  max,
  label,
  onChange,
}: QuantityStepperProps): ReactElement => {
  const t = useTranslations('cart');
  const limit = Math.min(max, MAX_LINE_QUANTITY);
  return (
    <div className="quantity-stepper" role="group" aria-label={t('quantityOf', { name: label })}>
      <button
        type="button"
        className="quantity-stepper__button"
        aria-label={t('decrease')}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output className="quantity-stepper__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="quantity-stepper__button"
        aria-label={t('increase')}
        disabled={value >= limit}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
};
