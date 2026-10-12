import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** Seller dashboard (figures arrive with BZ-061). */
export const SellerHomePage = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <main id="main" className="container stack">
      <h1>{t('seller.dashboardTitle')}</h1>
    </main>
  );
};
