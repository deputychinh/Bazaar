import { ProductStatus, QuoteProblem, ShopStatus } from '@bazaar/contracts';

import {
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  productFixture,
  testConfig,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';

import { QuoteService } from './quote.service.js';

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(() => {
    const products = new InMemoryProductsRepository([
      productFixture({
        id: 'p1',
        slug: 'lantern',
        variants: [
          { sku: 'LAN-RED', priceUsdCents: 1500, stock: 3, attributes: { color: 'Red' } },
          { sku: 'LAN-BLUE', priceUsdCents: 1800, stock: 0, attributes: null },
        ],
      }),
      productFixture({ id: 'p2', slug: 'draft-vase', status: ProductStatus.Draft }),
      productFixture({ id: 'p3', slug: 'orphan', shopId: 'missing-shop' }),
    ]);
    const shops = new InMemoryShopsRepository();
    shops.rows.push({
      id: 'shop-1',
      sellerId: 'seller-1',
      slug: 'hoi-an-lights',
      name: 'Hội An Lights',
      description: null,
      status: ShopStatus.Active,
      createdAt: new Date(),
    });
    service = new QuoteService(products, shops, new ImageUrlBuilder(testConfig()));
  });

  it('prices available lines with seller, shop, label and image', async () => {
    const { lines } = await service.quote({
      lines: [{ productSlug: 'lantern', variantSku: 'LAN-RED', quantity: 2 }],
    });

    expect(lines).toEqual([
      {
        productSlug: 'lantern',
        variantSku: 'LAN-RED',
        quantity: 2,
        available: true,
        productId: 'p1',
        sellerId: 'seller-1',
        shopId: 'shop-1',
        shopName: 'Hội An Lights',
        title: { en: 'Ceramic vase', vi: 'Bình hoa gốm' },
        variantLabel: { en: 'Red', vi: 'Red' },
        imageUrl: 'https://cdn.bazaar.test/bazaar-images/products/p1/a.webp',
        unitPriceUsdCents: 1500,
        stock: 3,
      },
    ]);
  });

  it('explains every line that cannot be bought, keeping the request order', async () => {
    const { lines } = await service.quote({
      lines: [
        { productSlug: 'lantern', variantSku: 'LAN-RED', quantity: 5 },
        { productSlug: 'lantern', variantSku: 'NOPE', quantity: 1 },
        { productSlug: 'draft-vase', variantSku: 'BZ-0001-1', quantity: 1 },
        { productSlug: 'orphan', variantSku: 'BZ-0001-1', quantity: 1 },
        { productSlug: 'unknown', variantSku: 'X', quantity: 1 },
      ],
    });

    expect(lines.map((line) => (line.available ? 'ok' : [line.problem, line.stock]))).toEqual([
      [QuoteProblem.InsufficientStock, 3],
      [QuoteProblem.NotFound, null],
      [QuoteProblem.NotPublished, null],
      [QuoteProblem.NotFound, null],
      [QuoteProblem.NotFound, null],
    ]);
  });
});
