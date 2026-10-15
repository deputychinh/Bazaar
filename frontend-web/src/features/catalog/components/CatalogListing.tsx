import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { listCategories, listProducts } from '@/api/catalog.server';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { Pagination } from '@/components/Pagination/Pagination';
import { IconName } from '@/enums/icon-name.enum';
import type { CatalogQuery } from '@/interfaces/catalog.interface';
import { catalogHref } from '@/utils/catalog-query.util';

import { CatalogFilters } from './CatalogFilters';
import { CategoryNav } from './CategoryNav';
import { ProductGrid } from './ProductGrid';
import { SortBar } from './SortBar';

import './CatalogListing.css';

interface CatalogListingProps {
  title: string;
  /** Listing path without locale, e.g. /search or /c/ceramics. */
  pathname: string;
  query: CatalogQuery;
  currentCategory?: string;
}

/** Shared body of category, search and shop pages: sidebar filters, sort tabs, dense grid. */
export const CatalogListing = async ({
  title,
  pathname,
  query,
  currentCategory,
}: CatalogListingProps): Promise<ReactElement> => {
  const t = await getTranslations('catalog');
  const [result, categories] = await Promise.all([listProducts(query), listCategories()]);
  const totalPages = result.data === null ? 0 : Math.ceil(result.data.total / result.data.pageSize);
  return (
    <main id="main" className="catalog-listing page container">
      <aside className="catalog-listing__sidebar">
        <div className="catalog-listing__box">
          <h2 className="catalog-listing__box-title">
            <Icon name={IconName.Grid} />
            {t('allCategories')}
          </h2>
          <CategoryNav categories={categories} currentSlug={currentCategory} />
        </div>
        <div className="catalog-listing__box">
          <CatalogFilters query={query} action={pathname} />
        </div>
      </aside>
      <div className="catalog-listing__main">
        <div className="catalog-listing__head">
          <h1 className="catalog-listing__title">{title}</h1>
          {result.data !== null && (
            <p className="catalog-listing__count">{t('results', { count: result.data.total })}</p>
          )}
        </div>
        {result.errorCode !== null ? (
          <ErrorState code={result.errorCode} />
        ) : (
          <>
            <SortBar
              query={query}
              pathname={pathname}
              page={result.data.page}
              totalPages={totalPages}
            />
            {result.data.items.length === 0 ? (
              <EmptyState title={t('noResults')} description={t('noResultsHint')} />
            ) : (
              <>
                {/* Visually hidden h2 keeps the outline h1 → h2 → h3 (product card titles). */}
                <h2 className="visually-hidden">{t('results', { count: result.data.total })}</h2>
                <ProductGrid products={result.data.items} />
                <Pagination
                  page={result.data.page}
                  totalPages={totalPages}
                  hrefFor={(page) => catalogHref(pathname, { ...query, page })}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};
