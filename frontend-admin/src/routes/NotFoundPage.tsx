import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export const NotFoundPage = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <main id="main" className="page container">
      <h1>{t('notFound.title')}</h1>
      <Link to="/">{t('notFound.back')}</Link>
    </main>
  );
};
