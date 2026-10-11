import { ProductStatus } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';

import {
  category,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NO_TRANSACTION,
  productFixture,
} from '../../../../test/fakes/catalog.fakes.js';
import { ProductSort } from '../../../enums/product-sort.enum.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsService } from '../../shops/services/shops.service.js';

import { ProductQueryService } from './product-query.service.js';

describe('ProductQueryService', () => {
  let products: InMemoryProductsRepository;
  let service: ProductQueryService;

  beforeEach(async () => {
    const shops = new InMemoryShopsRepository();
    await new ShopsService(shops).provisionForSeller(
      { userId: 'seller-1', applicationId: 'a', shopName: 'Gốm Minh Long' },
      NO_TRANSACTION,
    );
    const categories = new InMemoryCategoriesRepository([
      category({ id: 'cat-crafts', slug: 'crafts', path: '/crafts' }),
      category({
        id: 'cat-ceramics',
        slug: 'ceramics',
        path: '/crafts/ceramics',
        parentId: 'cat-crafts',
      }),
      category({ id: 'cat-audio', slug: 'audio', path: '/audio' }),
    ]);
    products = new InMemoryProductsRepository([
      productFixture({
        id: 'p1',
        slug: 'vase',
        minPriceUsdCents: 1500,
        rating: { average: 4.8, count: 3 },
      }),
      productFixture({
        id: 'p2',
        slug: 'tea-set',
        title: { en: 'Tea set', vi: 'Bộ ấm chén' },
        minPriceUsdCents: 900,
      }),
      productFixture({
        id: 'p3',
        slug: 'speaker',
        categoryId: 'cat-audio',
        minPriceUsdCents: 4000,
      }),
      productFixture({ id: 'p4', slug: 'draft', status: ProductStatus.Draft }),
    ]);
    service = new ProductQueryService(products, new CategoriesService(categories), shops);
  });

  it('includes sub-categories when filtering by a parent category', async () => {
    const page = await service.list({ category: 'crafts', page: 1, pageSize: 24 });

    expect(page.items.map((product) => product.slug).sort()).toEqual(['tea-set', 'vase']);
  });

  it('sorts by relevance when searching and by newest otherwise', async () => {
    const spy = vi.spyOn(products, 'search');

    await service.list({ q: 'ấm', page: 1, pageSize: 24 });
    await service.list({ page: 1, pageSize: 24 });

    expect(spy.mock.calls.map(([criteria]) => criteria.sort)).toEqual([
      ProductSort.Relevance,
      ProductSort.Newest,
    ]);
  });

  it('filters by price and sorts cheapest first', async () => {
    const page = await service.list({
      maxPrice: 2000,
      sort: ProductSort.PriceAsc,
      page: 1,
      pageSize: 24,
    });

    expect(page.items.map((product) => product.slug)).toEqual(['tea-set', 'vase']);
  });

  it('returns an empty page for an unknown category or shop', async () => {
    await expect(service.list({ category: 'nope', page: 1, pageSize: 24 })).resolves.toMatchObject({
      total: 0,
    });
    await expect(service.list({ shop: 'nope', page: 1, pageSize: 24 })).resolves.toMatchObject({
      total: 0,
    });
    await expect(
      service.list({ shop: 'gom-minh-long', page: 1, pageSize: 24 }),
    ).resolves.toMatchObject({ total: 3 });
  });

  it('shows only published products by slug', async () => {
    await expect(service.bySlug('vase')).resolves.toMatchObject({
      shop: { slug: 'gom-minh-long' },
    });
    await expect(service.bySlug('draft')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.bySlug('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
