import { z } from 'zod';

import { ProductSort } from '@/api/catalog.schema';
import { CATALOG_PAGE_SIZE } from '@/constants/catalog.constant';
import { CENTS_PER_USD } from '@/constants/currency.constant';
import type { CatalogQuery } from '@/interfaces/catalog.interface';

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// Each field is checked alone: one bad value (e.g. ?page=abc) is dropped, the rest still applies.
const fields = {
  q: z.string().trim().min(1).max(100),
  minPrice: z.coerce.number().int().min(0),
  maxPrice: z.coerce.number().int().min(0),
  minRating: z.coerce.number().min(0).max(5),
  sort: z.enum(ProductSort),
  page: z.coerce.number().int().min(1).max(200),
};

/** Catalog filters from the URL (prices in USD cents, like the API). */
export const parseCatalogQuery = (searchParams: SearchParams): CatalogQuery => {
  const query: CatalogQuery = { pageSize: CATALOG_PAGE_SIZE };
  for (const [name, schema] of Object.entries(fields)) {
    const result = schema.safeParse(first(searchParams[name]));
    if (result.success) Object.assign(query, { [name]: result.data });
  }
  // The filter form sends dollars (minPriceUsd); links and the API use cents (minPrice).
  for (const [dollars, cents] of [
    ['minPriceUsd', 'minPrice'],
    ['maxPriceUsd', 'maxPrice'],
  ] as const) {
    const result = z.coerce.number().min(0).safeParse(first(searchParams[dollars]));
    if (result.success && first(searchParams[dollars]) !== '')
      query[cents] = Math.round(result.data * CENTS_PER_USD);
  }
  // Relevance only makes sense with a search text.
  if (query.sort === ProductSort.relevance && query.q === undefined) delete query.sort;
  return query;
};

/** URL of a listing with the given query, without defaults or empty values. */
export const catalogHref = (pathname: string, query: CatalogQuery): string => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    const isDefault =
      (name === 'page' && value === 1) || name === 'pageSize' || name === 'category';
    if (value !== undefined && value !== '' && !isDefault) params.set(name, String(value));
  }
  const search = params.toString();
  return search === '' ? pathname : `${pathname}?${search}`;
};
