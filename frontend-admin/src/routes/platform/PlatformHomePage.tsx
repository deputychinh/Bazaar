import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** Platform dashboard (figures arrive with BZ-061). */
export const PlatformHomePage = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <main id="main" className="container stack">
      <h1>{t('platform.dashboardTitle')}</h1>
    </main>
  );
};
