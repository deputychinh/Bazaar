import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { listCategories } from '@/api/catalog.server';
import { CatalogListing } from '@/features/catalog/components/CatalogListing';
import { pageLocale } from '@/i18n/page-locale';
import type { Category } from '@/interfaces/catalog.interface';
import { localizedAlternates } from '@/utils/alternates.util';
import { parseCatalogQuery } from '@/utils/catalog-query.util';
import { pickLocalized } from '@/utils/localized-text.util';

const findCategory = (categories: readonly Category[], slug: string): Category | undefined =>
  categories
    .flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === slug);

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/c/[category]'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const { category: slug } = await params;
  const category = findCategory(await listCategories(), slug);
  return category === undefined
    ? {}
    : {
        title: pickLocalized(category.name, locale),
        alternates: localizedAlternates(locale, `/c/${slug}`),
      };
};

/** Server-rendered per request: fresh prices and stock for every visitor (plan §6.2). */
const CategoryPage = async ({
  params,
  searchParams,
}: PageProps<'/[locale]/c/[category]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const { category: slug } = await params;
  const category = findCategory(await listCategories(), slug);
  if (category === undefined) notFound();
  const query = { ...parseCatalogQuery(await searchParams), category: slug };
  return (
    <CatalogListing
      title={pickLocalized(category.name, locale)}
      pathname={`/c/${slug}`}
      query={query}
      currentCategory={slug}
    />
  );
};

export default CategoryPage;
