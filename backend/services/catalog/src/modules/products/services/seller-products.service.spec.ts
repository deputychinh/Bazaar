import { EventType, ProductStatus } from '@bazaar/contracts';
import { ConflictError, FixedClock, InMemoryCacheStore, NotFoundError } from '@bazaar/nest-common';

import {
  category,
  ImmediateTransactionManager,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NO_TRANSACTION,
  NOW,
  productFixture,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsService } from '../../shops/services/shops.service.js';
import type { CreateProductDto } from '../dto/seller-product.dto.js';
import { InvalidProductTransitionError } from '../errors/invalid-product-transition.error.js';

import { ProductEvents } from './product-events.js';
import { SellerProductsService } from './seller-products.service.js';

const CATEGORY_ID = 'ca0000000000000000000005';
const newProduct = (overrides: Partial<CreateProductDto> = {}): CreateProductDto => ({
  title: { en: 'Ceramic tea set', vi: 'Bộ ấm chén gốm' },
  description: { en: 'Hand-painted in Bát Tràng.', vi: 'Vẽ tay tại Bát Tràng.' },
  categoryId: CATEGORY_ID,
  attributes: null,
  variants: [{ sku: 'TEA-1', priceUsdCents: 2500, stock: 4, attributes: null }],
  ...overrides,
});

describe('SellerProductsService', () => {
  let products: InMemoryProductsRepository;
  let outbox: RecordingOutbox;
  let service: SellerProductsService;
  let cache: InMemoryCacheStore;

  beforeEach(async () => {
    const shops = new InMemoryShopsRepository();
    await new ShopsService(shops).provisionForSeller(
      { userId: 'seller-1', applicationId: 'a', shopName: 'Gốm Minh Long' },
      NO_TRANSACTION,
    );
    products = new InMemoryProductsRepository([
      productFixture({
        id: 'other',
        sellerId: 'seller-2',
        variants: [{ sku: 'TAKEN-1', priceUsdCents: 100, stock: 1, attributes: null }],
      }),
    ]);
    outbox = new RecordingOutbox();
    cache = new InMemoryCacheStore();
    service = new SellerProductsService(
      products,
      shops,
      new CategoriesService(
        new InMemoryCategoriesRepository([
          category({ id: CATEGORY_ID, slug: 'ceramics', path: '/ceramics' }),
        ]),
        cache,
      ),
      new ProductEvents(outbox),
      new ImmediateTransactionManager(),
      cache,
      new FixedClock(NOW),
    );
  });

  it('creates a draft with derived price, stock and slug, without events', async () => {
    const product = await service.create('seller-1', newProduct());

    expect(product).toMatchObject({
      status: ProductStatus.Draft,
      slug: 'ceramic-tea-set',
      minPriceUsdCents: 2500,
      totalStock: 4,
      shopId: 'shop-1',
    });
    expect(outbox.events).toEqual([]);
  });

  it('refuses a seller whose shop is not ready, an unknown category and a taken SKU', async () => {
    await expect(service.create('seller-without-shop', newProduct())).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      service.create('seller-1', newProduct({ categoryId: 'ca0000000000000000000099' })),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.create(
        'seller-1',
        newProduct({
          variants: [{ sku: 'TAKEN-1', priceUsdCents: 1, stock: 1, attributes: null }],
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('publishes, then announces updates while public and hides on unpublish', async () => {
    const draft = await service.create('seller-1', newProduct());

    const published = await service.publish('seller-1', draft.id);
    await service.update('seller-1', draft.id, {
      variants: [{ sku: 'TEA-1', priceUsdCents: 1900, stock: 10, attributes: null }],
    });
    await service.unpublish('seller-1', draft.id);

    expect(published).toMatchObject({ status: ProductStatus.Published, publishedAt: NOW });
    expect(outbox.events.map((event) => event.type)).toEqual([
      EventType.ProductPublished,
      EventType.ProductUpdated,
      EventType.ProductHidden,
    ]);
    expect(outbox.events[1]?.payload).toEqual({
      productId: draft.id,
      shopId: 'shop-1',
      slug: 'ceramic-tea-set',
    });
    expect(products.rows.find((product) => product.id === draft.id)).toMatchObject({
      minPriceUsdCents: 1900,
      totalStock: 10,
    });
  });

  it("hides other sellers' products and refuses invalid transitions", async () => {
    const draft = await service.create('seller-1', newProduct());

    await expect(service.get('seller-2', draft.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.publish('seller-1', 'other')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.unpublish('seller-1', draft.id)).rejects.toBeInstanceOf(
      InvalidProductTransitionError,
    );
  });

  it('drops the cached public page when the product changes', async () => {
    const draft = await service.create('seller-1', newProduct());
    await service.publish('seller-1', draft.id);
    cache.entries.set('catalog:product:ceramic-tea-set', '{"stale":true}');

    await service.update('seller-1', draft.id, {
      title: { en: 'Ceramic tea set', vi: 'Bộ ấm chén gốm mới' },
    });

    expect(cache.entries.has('catalog:product:ceramic-tea-set')).toBe(false);
  });

  it('lists only the caller’s products', async () => {
    await service.create('seller-1', newProduct());

    const page = await service.list('seller-1', { page: 1, pageSize: 20 });

    expect(page).toMatchObject({ total: 1, items: [{ sellerId: 'seller-1' }] });
  });
});
