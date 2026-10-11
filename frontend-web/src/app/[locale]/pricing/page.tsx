import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CardList } from '@/features/marketing/components/CardList';
import { Hero } from '@/features/marketing/components/Hero';
import { pageLocale } from '@/i18n/page-locale';
import { staticPageMetadata } from '@/i18n/page-metadata';
import type { MarketingItem } from '@/interfaces/marketing.interface';

export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/pricing'>): Promise<Metadata> =>
  staticPageMetadata(await pageLocale(params), 'pricing', '/pricing');

const PricingPage = async ({ params }: PageProps<'/[locale]/pricing'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return (
    <main id="main">
      <Hero title={t('title')} lead={t('lead')} />
      <CardList title={t('plansTitle')} items={t.raw('plans') as MarketingItem[]} />
    </main>
  );
};

export default PricingPage;
