import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { getHomeFeed } from '@/api/home.server';
import { CategoryTiles } from '@/features/home/components/CategoryTiles';
import { HomeBanner } from '@/features/home/components/HomeBanner';
import { HomePerks } from '@/features/home/components/HomePerks';
import { ProductRow } from '@/features/home/components/ProductRow';
import { pageLocale } from '@/i18n/page-locale';

/**
 * ISR: the home page is cached and rebuilt in the background at most every 2 minutes, so best
 * sellers and new ratings show up without a deploy. Must be a literal: Next reads it at build time.
 */
export const revalidate = 120;

const HomePage = async ({ params }: PageProps<'/[locale]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const [t, feed] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getHomeFeed(),
  ]);
  return (
    <main id="main" className="page container">
      <HomeBanner showcase={feed?.topSales ?? []} />
      <HomePerks />
      {feed === null ? (
        <p className="panel panel__body">{t('unavailable')}</p>
      ) : (
        <>
          {feed.categories.length > 0 && <CategoryTiles categories={feed.categories} />}
          <ProductRow
            id="home-top-sales"
            title={t('topSalesTitle')}
            products={feed.topSales}
            ribbon={t('topBadge')}
            more={{ href: '/search?sort=best_selling', label: t('seeAll') }}
          />
          <ProductRow
            id="home-discover"
            title={t('discoverTitle')}
            products={feed.discover}
            moreButton={{ href: '/search?sort=rating', label: t('seeMore') }}
          />
        </>
      )}
    </main>
  );
};

export default HomePage;
