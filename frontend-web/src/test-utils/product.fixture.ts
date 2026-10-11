import { ProductStatus } from '@/api/catalog.schema';
import type { ProductDetail } from '@/interfaces/catalog.interface';

/** A published product with two variants, the second sold out. */
export const productFixture = (overrides: Partial<ProductDetail> = {}): ProductDetail => ({
  id: 'p1',
  slug: 'silk-lantern',
  title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
  description: { en: 'Made by hand in Hội An.', vi: 'Làm thủ công ở Hội An.' },
  minPriceUsdCents: 1500,
  imageUrl: 'http://127.0.0.1:9002/bazaar-images/a.png',
  rating: { average: 4.5, count: 12 },
  inStock: true,
  categoryId: 'c1',
  status: ProductStatus.PUBLISHED,
  attributes: null,
  variants: [
    { sku: 'LAN-RED', priceUsdCents: 1500, stock: 3, attributes: { color: 'Red' } },
    { sku: 'LAN-BLUE', priceUsdCents: 1800, stock: 0, attributes: { color: 'Blue' } },
  ],
  images: [
    { url: 'http://127.0.0.1:9002/bazaar-images/a.png', alt: null },
    { url: 'http://127.0.0.1:9002/bazaar-images/b.png', alt: { en: 'Side view' } },
  ],
  shop: { slug: 'hoi-an-lights', name: 'Hội An Lights' },
  publishedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});
