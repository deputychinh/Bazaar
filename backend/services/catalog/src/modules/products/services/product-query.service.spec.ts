import { ProductStatus } from '@bazaar/contracts';
import { InMemoryCacheStore, NotFoundError } from '@bazaar/nest-common';

import {
  category,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NO_TRANSACTION,
  productFixture,
  testConfig,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import { ProductSort } from '../../../enums/product-sort.enum.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsService } from '../../shops/services/shops.service.js';

import { ProductPresenter } from './product-presenter.js';
import { ProductQueryService } from './product-query.service.js';

describe('ProductQueryService', () => {
  let products: InMemoryProductsRepository;
  let service: ProductQueryService;
  let cache: InMemoryCacheStore;

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
        soldCount: 10,
      }),
      productFixture({
        id: 'p3',
        slug: 'speaker',
        categoryId: 'cat-audio',
        minPriceUsdCents: 4000,
        soldCount: 90,
      }),
      productFixture({ id: 'p4', slug: 'draft', status: ProductStatus.Draft }),
    ]);
    cache = new InMemoryCacheStore();
    service = new ProductQueryService(
      products,
      new CategoriesService(categories, cache),
      shops,
      new ProductPresenter(new ImageUrlBuilder(testConfig())),
      cache,
    );
  });

  it('includes sub-categories when filtering by a parent category', async () => {
    const page = await service.list({ category: 'crafts', page: 1, pageSize: 24 });

    expect(page.items.map((product) => product.slug).sort()).toEqual(['tea-set', 'vase']);
  });

  it('puts the best sellers first', async () => {
    const page = await service.list({ sort: ProductSort.BestSelling, page: 1, pageSize: 24 });

    expect(page.items.map((product) => product.slug)).toEqual(['speaker', 'tea-set', 'vase']);
    expect(page.items[0]?.soldCount).toBe(90);
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
    await expect(service.detail('vase')).resolves.toMatchObject({
      slug: 'vase',
      shop: { slug: 'gom-minh-long' },
    });
    await expect(service.detail('draft')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.detail('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('serves a product page from the cache after the first read, but never caches a 404', async () => {
    const spy = vi.spyOn(products, 'findBySlug');

    await service.detail('vase');
    await service.detail('vase');
    await expect(service.detail('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.detail('missing')).rejects.toBeInstanceOf(NotFoundError);

    expect(spy.mock.calls.map(([slug]) => slug)).toEqual(['vase', 'missing', 'missing']);
    expect([...cache.entries.keys()]).toContain('catalog:product:vase');
  });
});
