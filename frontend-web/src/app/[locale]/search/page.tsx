import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CatalogListing } from '@/features/catalog/components/CatalogListing';
import { pageLocale } from '@/i18n/page-locale';
import { localizedAlternates } from '@/utils/alternates.util';
import { parseCatalogQuery } from '@/utils/catalog-query.util';

/** Server-rendered on every request: results follow the URL (plan §6.2). */
export const generateMetadata = async ({
  params,
  searchParams,
}: PageProps<'/[locale]/search'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const query = parseCatalogQuery(await searchParams);
  return {
    title: query.q === undefined ? t('searchTitle') : t('resultsFor', { query: query.q }),
    alternates: localizedAlternates(locale, '/search'),
    // Internal search results are not worth indexing; the browse page (no query) is.
    robots: query.q === undefined ? undefined : { index: false, follow: true },
  };
};

const SearchPage = async ({
  params,
  searchParams,
}: PageProps<'/[locale]/search'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const query = parseCatalogQuery(await searchParams);
  const title = query.q === undefined ? t('searchTitle') : t('resultsFor', { query: query.q });
  return <CatalogListing title={title} pathname="/search" query={query} />;
};

export default SearchPage;
