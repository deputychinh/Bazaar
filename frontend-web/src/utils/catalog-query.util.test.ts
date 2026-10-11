import { ProductSort } from '@/api/catalog.schema';

import { catalogHref, parseCatalogQuery } from './catalog-query.util';

describe('parseCatalogQuery', () => {
  it('reads filters, sort and page from the URL', () => {
    expect(
      parseCatalogQuery({
        q: ' nón lá ',
        minPrice: '500',
        minRating: '4',
        sort: 'price_asc',
        page: '3',
      }),
    ).toEqual({
      q: 'nón lá',
      minPrice: 500,
      minRating: 4,
      sort: ProductSort.price_asc,
      page: 3,
      pageSize: 24,
    });
  });

  it('converts dollars typed in the filter form into cents', () => {
    expect(
      parseCatalogQuery({ minPriceUsd: '12.5', maxPriceUsd: '40', minPrice: '1' }),
    ).toMatchObject({ minPrice: 1250, maxPrice: 4000 });
    expect(parseCatalogQuery({ minPriceUsd: '' })).not.toHaveProperty('minPrice');
  });

  it('drops invalid values but keeps the rest', () => {
    expect(parseCatalogQuery({ page: 'abc', sort: 'cheapest', minRating: '9', q: 'lụa' })).toEqual({
      q: 'lụa',
      pageSize: 24,
    });
  });

  it('ignores relevance sorting without a search text', () => {
    expect(parseCatalogQuery({ sort: 'relevance' })).not.toHaveProperty('sort');
  });
});

describe('catalogHref', () => {
  it('builds a clean URL without defaults', () => {
    expect(catalogHref('/search', { q: 'gốm', page: 1, pageSize: 24 })).toBe(
      '/search?q=g%E1%BB%91m',
    );
    expect(catalogHref('/c/silk', { category: 'silk', page: 2, sort: ProductSort.newest })).toBe(
      '/c/silk?page=2&sort=newest',
    );
    expect(catalogHref('/search', {})).toBe('/search');
    expect(catalogHref('/s/gom-hoa', { shop: 'gom-hoa', page: 2 })).toBe('/s/gom-hoa?page=2');
  });
});
