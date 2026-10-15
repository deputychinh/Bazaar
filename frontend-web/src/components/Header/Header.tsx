import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { HEADER_CATEGORY_SLUGS } from '@/constants/catalog.constant';
import { IconName } from '@/enums/icon-name.enum';
import { AccountLink } from '@/features/auth/components/AccountLink';
import { CartLink } from '@/features/cart/components/CartLink';
import { CurrencySwitcher } from '@/features/currency/components/CurrencySwitcher';
import { LocaleSwitcher } from '@/features/locale/components/LocaleSwitcher';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Link } from '@/i18n/navigation';

import './Header.css';

/**
 * Marketplace header: a utility bar (seller links, language, currency, account), then the logo,
 * a wide search box with popular categories under it, and the cart. The search is a plain GET
 * form, so it works before JavaScript loads.
 */
export const Header = async (): Promise<ReactElement> => {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations('nav'),
    getTranslations('categories'),
    getLocale(),
  ]);
  return (
    <header className="header">
      <div className="header__top container">
        <nav className="header__links" aria-label={t('label')}>
          <Link className="header__top-link" href="/sell">
            <Icon name={IconName.Store} />
            {t('sellerCentre')}
          </Link>
          <Link className="header__top-link" href="/pricing">
            {t('pricing')}
          </Link>
          <Link className="header__top-link" href="/about">
            {t('about')}
          </Link>
        </nav>
        <div className="header__tools" role="group" aria-label={t('toolsLabel')}>
          <NotificationBell />
          <LocaleSwitcher />
          <CurrencySwitcher />
          <AccountLink />
        </div>
      </div>
      <div className="header__main container">
        <Link className="header__logo" href="/">
          <Icon className="header__logo-mark" name={IconName.Store} />
          Bazaar
        </Link>
        <div className="header__search-area">
          <form className="header__search" role="search" action={`/${locale}/search`} method="get">
            <label className="visually-hidden" htmlFor="header__search">
              {t('searchLabel')}
            </label>
            <input
              id="header__search"
              className="header__search-input"
              type="search"
              name="q"
              placeholder={t('searchPlaceholder')}
              maxLength={100}
              autoComplete="off"
            />
            <button className="header__search-button" type="submit">
              <Icon name={IconName.Search} />
              <span className="visually-hidden">{t('search')}</span>
            </button>
          </form>
          <nav className="header__categories" aria-label={t('categoriesLabel')}>
            {HEADER_CATEGORY_SLUGS.map((slug) => (
              <Link key={slug} className="header__category" href={`/c/${slug}`}>
                {tCategories(slug)}
              </Link>
            ))}
          </nav>
        </div>
        <CartLink />
      </div>
    </header>
  );
};
