'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, ReactElement } from 'react';

import { DisplayCurrency } from '@/api/gateway.schema';

import { useCurrency } from '../useCurrency';

import './CurrencySwitcher.css';

export const CurrencySwitcher = (): ReactElement => {
  const t = useTranslations('currency');
  const { currency, choose } = useCurrency();
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void =>
    choose(event.target.value as DisplayCurrency);
  return (
    <label className="currency-switcher">
      <span className="visually-hidden">{t('label')}</span>
      <select className="currency-switcher__select" value={currency} onChange={onChange}>
        <option value={DisplayCurrency.USD}>{t('USD')}</option>
        <option value={DisplayCurrency.VND}>{t('VND')}</option>
      </select>
    </label>
  );
};
