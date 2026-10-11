import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CardList } from '@/features/marketing/components/CardList';
import { Hero } from '@/features/marketing/components/Hero';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { staticPageMetadata } from '@/i18n/page-metadata';
import type { MarketingItem } from '@/interfaces/marketing.interface';

export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/sell'>): Promise<Metadata> =>
  staticPageMetadata(await pageLocale(params), 'sell', '/sell');

const SellPage = async ({ params }: PageProps<'/[locale]/sell'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'sell' });
  return (
    <main id="main">
      <Hero
        title={t('title')}
        lead={t('lead')}
        actions={
          <Link className="button button--primary" href="/register">
            {t('start')}
          </Link>
        }
      />
      <CardList title={t('stepsTitle')} items={t.raw('steps') as MarketingItem[]} isNumbered />
    </main>
  );
};

export default SellPage;
