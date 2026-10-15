import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** Entry page until the signed-in shell (BZ-058) routes people to their area. */
export const StartPage = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <main id="main" className="page container">
      <h1>{t('app.title')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  );
};
