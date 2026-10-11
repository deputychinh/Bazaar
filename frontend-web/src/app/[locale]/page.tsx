import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { FEATURED_CATEGORY_SLUGS } from '@/constants/catalog.constant';
import { CardList } from '@/features/marketing/components/CardList';
import { Hero } from '@/features/marketing/components/Hero';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import type { MarketingItem } from '@/interfaces/marketing.interface';

export const dynamic = 'force-static';

const HomePage = async ({ params }: PageProps<'/[locale]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'home' });
  return (
    <main id="main">
      <Hero
        title={t('heading')}
        lead={t('lead')}
        actions={
          <>
            <Link className="button button--primary" href="/search">
              {t('shopNow')}
            </Link>
            <Link className="button button--ghost" href="/sell">
              {t('sell')}
            </Link>
          </>
        }
      />
      <section className="section">
        <div className="container stack">
          <h2>{t('categoriesTitle')}</h2>
          <ul className="cluster">
            {FEATURED_CATEGORY_SLUGS.map((slug) => (
              <li key={slug}>
                <Link className="button button--secondary" href={`/c/${slug}`}>
                  {t(`categories.${slug}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CardList title={t('valuesTitle')} items={t.raw('values') as MarketingItem[]} />
    </main>
  );
};

export default HomePage;
