import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { pageLocale } from '@/i18n/page-locale';

export const dynamic = 'force-static';

// TODO(BZ-036): replace with the full landing page.
const HomePage = async ({ params }: PageProps<'/[locale]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'home' });
  return (
    <main id="main" className="container">
      <div className="stack">
        <h1>{t('heading')}</h1>
        <p>{t('lead')}</p>
      </div>
    </main>
  );
};

export default HomePage;
