import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { getShop } from '@/api/catalog.server';
import { CatalogListing } from '@/features/catalog/components/CatalogListing';
import { pageLocale } from '@/i18n/page-locale';
import { localizedAlternates } from '@/utils/alternates.util';
import { parseCatalogQuery } from '@/utils/catalog-query.util';
import { pickLocalized } from '@/utils/localized-text.util';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/s/[shop]'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  return shop === null
    ? {}
    : {
        title: shop.name,
        description:
          shop.description === null ? undefined : pickLocalized(shop.description, locale),
        alternates: localizedAlternates(locale, `/s/${slug}`),
      };
};

/** A shop's storefront: its published products, server-rendered like the catalog pages. */
const ShopPage = async ({
  params,
  searchParams,
}: PageProps<'/[locale]/s/[shop]'>): Promise<ReactElement> => {
  await pageLocale(params);
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  if (shop === null) notFound();
  const query = { ...parseCatalogQuery(await searchParams), shop: slug };
  return <CatalogListing title={shop.name} pathname={`/s/${slug}`} query={query} />;
};

export default ShopPage;
