import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CurrencySwitcher } from '@/features/currency/components/CurrencySwitcher';
import { LocaleSwitcher } from '@/features/locale/components/LocaleSwitcher';
import { Link } from '@/i18n/navigation';

import './Header.css';

export const Header = async (): Promise<ReactElement> => {
  const t = await getTranslations('nav');
  return (
    <header className="header">
      <div className="header__inner container">
        <Link className="header__logo" href="/">
          Bazaar
        </Link>
        <nav className="header__nav" aria-label={t('label')}>
          <Link className="header__link" href="/search">
            {t('shop')}
          </Link>
          <Link className="header__link" href="/sell">
            {t('sell')}
          </Link>
        </nav>
        <div className="header__tools">
          <LocaleSwitcher />
          <CurrencySwitcher />
          <Link className="header__link" href="/cart">
            {t('cart')}
          </Link>
        </div>
      </div>
    </header>
  );
};
