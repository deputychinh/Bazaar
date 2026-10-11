import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { listCategories, listProducts } from '@/api/catalog.server';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Pagination } from '@/components/Pagination/Pagination';
import type { CatalogQuery } from '@/interfaces/catalog.interface';
import { catalogHref } from '@/utils/catalog-query.util';

import { CatalogFilters } from './CatalogFilters';
import { CategoryNav } from './CategoryNav';
import { ProductGrid } from './ProductGrid';

import './CatalogListing.css';

interface CatalogListingProps {
  title: string;
  /** Listing path without locale, e.g. /search or /c/ceramics. */
  pathname: string;
  query: CatalogQuery;
  currentCategory?: string;
}

/** Shared body of category and search pages: filters, results, pagination, empty/error states. */
export const CatalogListing = async ({
  title,
  pathname,
  query,
  currentCategory,
}: CatalogListingProps): Promise<ReactElement> => {
  const t = await getTranslations('catalog');
  const [result, categories] = await Promise.all([listProducts(query), listCategories()]);
  return (
    <main id="main" className="catalog-listing container">
      <aside className="catalog-listing__sidebar">
        <CategoryNav categories={categories} currentSlug={currentCategory} />
      </aside>
      <div className="catalog-listing__main stack">
        <h1>{title}</h1>
        <CatalogFilters query={query} action={pathname} />
        {result.errorCode !== null ? (
          <ErrorState code={result.errorCode} />
        ) : result.data.items.length === 0 ? (
          <EmptyState title={t('noResults')} description={t('noResultsHint')} />
        ) : (
          <>
            <p className="catalog-listing__count">{t('results', { count: result.data.total })}</p>
            <ProductGrid products={result.data.items} />
            <Pagination
              page={result.data.page}
              totalPages={Math.ceil(result.data.total / result.data.pageSize)}
              hrefFor={(page) => catalogHref(pathname, { ...query, page })}
            />
          </>
        )}
      </div>
    </main>
  );
};
