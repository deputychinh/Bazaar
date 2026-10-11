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
}: PageProps<'/[locale]/about'>): Promise<Metadata> =>
  staticPageMetadata(await pageLocale(params), 'about', '/about');

const AboutPage = async ({ params }: PageProps<'/[locale]/about'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'about' });
  return (
    <main id="main">
      <Hero title={t('title')} lead={t('lead')} />
      <CardList title={t('storyTitle')} items={t.raw('story') as MarketingItem[]} />
    </main>
  );
};

export default AboutPage;
