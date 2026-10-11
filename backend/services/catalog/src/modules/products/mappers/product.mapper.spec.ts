import { ProductStatus } from '@bazaar/contracts';

import type { Product as ProductRow } from '#prisma';

import { ProductMapper } from './product.mapper.js';

const row = {
  id: 'b00000000000000000000001',
  shopId: '5b0000000000000000000001',
  sellerId: 'seller-1',
  slug: 'ceramic-vase-1',
  title: { en: 'Ceramic vase', vi: null },
  description: { en: 'Hand-made', vi: 'Thủ công' },
  categoryId: 'ca0000000000000000000001',
  attributes: { origin: 'Vietnam' },
  variants: [{ sku: 'BZ-1', priceUsdCents: 1500, stock: 2, attributes: null }],
  images: [
    { key: 'a.webp', alt: null },
    { key: 'b.webp', alt: { en: 'Side', vi: null } },
  ],
  status: 'PUBLISHED',
  minPriceUsdCents: 1500,
  totalStock: 2,
  rating: { average: 4, count: 1 },
  hiddenReason: null,
  publishedAt: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
} as ProductRow;

describe('ProductMapper', () => {
  it('maps stored documents and drops missing Vietnamese text', () => {
    const product = ProductMapper.toDomain(row);

    expect(product).toMatchObject({
      status: ProductStatus.Published,
      title: { en: 'Ceramic vase', vi: undefined },
      attributes: { origin: 'Vietnam' },
      variants: [{ sku: 'BZ-1', attributes: null }],
      images: [
        { key: 'a.webp', alt: null },
        { key: 'b.webp', alt: { en: 'Side', vi: undefined } },
      ],
    });
  });
});
