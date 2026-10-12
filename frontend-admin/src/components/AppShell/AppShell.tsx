import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';

import type { Locale } from '@/api/gateway.schema';
import { UserRole } from '@/api/gateway.schema';
import { LOCALES } from '@/constants/locale.constant';
import { LOCALE_STORAGE_KEY } from '@/constants/settings.constant';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cx } from '@/utils/cx.util';

import './AppShell.css';

const navClass = ({ isActive }: { isActive: boolean }): string =>
  cx('app-shell__link', isActive && 'is-active');

/** Header with the areas the user may open, the language setting and sign-out; pages below. */
export const AppShell = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const changeLocale = (event: ChangeEvent<HTMLSelectElement>): void => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, event.target.value);
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <header className="app-shell">
        <div className="app-shell__inner container">
          <span className="app-shell__brand">{t('app.title')}</span>
          {user !== null && (
            <nav className="app-shell__nav" aria-label={t('nav.label')}>
              {user.role === UserRole.SELLER && (
                <>
                  <NavLink className={navClass} to="/seller" end>
                    {t('nav.dashboard')}
                  </NavLink>
                  <NavLink className={navClass} to="/seller/products">
                    {t('nav.products')}
                  </NavLink>
                  <NavLink className={navClass} to="/seller/orders">
                    {t('nav.orders')}
                  </NavLink>
                </>
              )}
              {user.role === UserRole.ADMIN && (
                <>
                  <NavLink className={navClass} to="/platform" end>
                    {t('nav.dashboard')}
                  </NavLink>
                  <NavLink className={navClass} to="/platform/sellers">
                    {t('nav.sellers')}
                  </NavLink>
                  <NavLink className={navClass} to="/platform/products">
                    {t('nav.moderation')}
                  </NavLink>
                  <NavLink className={navClass} to="/platform/events">
                    {t('nav.events')}
                  </NavLink>
                </>
              )}
            </nav>
          )}
          <div className="app-shell__tools">
            <label className="app-shell__locale">
              <span className="visually-hidden">{t('locale.label')}</span>
              <select value={i18n.language} onChange={changeLocale}>
                {LOCALES.map((locale: Locale) => (
                  <option key={locale} value={locale}>
                    {t(`locale.${locale}`)}
                  </option>
                ))}
              </select>
            </label>
            {user !== null && (
              <>
                <span className="app-shell__user">{user.email}</span>
                <button type="button" className="app-shell__link" onClick={() => void logout()}>
                  {t('nav.signOut')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
};
