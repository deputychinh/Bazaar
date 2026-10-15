import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';

import type { Locale } from '@/api/gateway.schema';
import { UserRole } from '@/api/gateway.schema';
import { Icon } from '@/components/Icon/Icon';
import { LOCALES } from '@/constants/locale.constant';
import { LOCALE_STORAGE_KEY } from '@/constants/settings.constant';
import { IconName } from '@/enums/icon-name.enum';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cx } from '@/utils/cx.util';

import './AppShell.css';

const navClass = ({ isActive }: { isActive: boolean }): string =>
  cx('app-shell__link', isActive && 'is-active');

/**
 * Seller Centre layout: a top bar (brand, language, account) and a sidebar with the areas the
 * user may open; pages render beside it. Signed out (login), only the top bar shows.
 */
export const AppShell = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const changeLocale = (event: ChangeEvent<HTMLSelectElement>): void => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, event.target.value);
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <div className={cx('app-shell', user !== null && 'app-shell--signed-in')}>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <header className="app-shell__top">
        <span className="app-shell__brand">
          <Icon className="app-shell__logo" name={IconName.Store} />
          Bazaar
          <span className="app-shell__area">
            {user?.role === UserRole.ADMIN ? t('nav.adminCentre') : t('nav.sellerCentre')}
          </span>
        </span>
        <div className="app-shell__tools">
          <label className="app-shell__locale">
            <span className="visually-hidden">{t('locale.label')}</span>
            <Icon name={IconName.Globe} />
            <select
              className="app-shell__locale-select"
              value={i18n.language}
              onChange={changeLocale}
            >
              {LOCALES.map((locale: Locale) => (
                <option key={locale} value={locale}>
                  {t(`locale.${locale}`)}
                </option>
              ))}
            </select>
          </label>
          {user !== null && (
            <>
              <span className="app-shell__user">
                <span className="app-shell__avatar" aria-hidden="true">
                  {user.email.charAt(0).toUpperCase()}
                </span>
                {user.email}
              </span>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => void logout()}
              >
                <Icon name={IconName.Logout} />
                {t('nav.signOut')}
              </button>
            </>
          )}
        </div>
      </header>
      {user !== null && (
        <nav className="app-shell__sidebar" aria-label={t('nav.label')}>
          {user.role === UserRole.SELLER && (
            <>
              <p className="app-shell__section">{t('nav.sectionShop')}</p>
              <NavLink className={navClass} to="/seller" end>
                <Icon name={IconName.Dashboard} />
                {t('nav.dashboard')}
              </NavLink>
              <NavLink className={navClass} to="/seller/products">
                <Icon name={IconName.Box} />
                {t('nav.products')}
              </NavLink>
              <NavLink className={navClass} to="/seller/orders">
                <Icon name={IconName.Receipt} />
                {t('nav.orders')}
              </NavLink>
            </>
          )}
          {user.role === UserRole.ADMIN && (
            <>
              <p className="app-shell__section">{t('nav.sectionPlatform')}</p>
              <NavLink className={navClass} to="/platform" end>
                <Icon name={IconName.Dashboard} />
                {t('nav.dashboard')}
              </NavLink>
              <NavLink className={navClass} to="/platform/sellers">
                <Icon name={IconName.Users} />
                {t('nav.sellers')}
              </NavLink>
              <NavLink className={navClass} to="/platform/products">
                <Icon name={IconName.Flag} />
                {t('nav.moderation')}
              </NavLink>
              <NavLink className={navClass} to="/platform/events">
                <Icon name={IconName.Activity} />
                {t('nav.events')}
              </NavLink>
            </>
          )}
        </nav>
      )}
      <div className="app-shell__content">
        <Outlet />
      </div>
    </div>
  );
};
