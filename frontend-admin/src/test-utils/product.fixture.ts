import { ProductStatus } from '@/api/catalog.schema';
import type { SellerProduct } from '@/interfaces/product.interface';

export const fixtureCategoryId = 'ca0000000000000000000002';

export const sellerProductFixture = (overrides: Partial<SellerProduct> = {}): SellerProduct => ({
  id: 'b00000000000000000000001',
  slug: 'silk-lantern-1',
  title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
  description: { en: 'Made by hand in Hội An.', vi: 'Làm thủ công ở Hội An.' },
  minPriceUsdCents: 1500,
  imageUrl: null,
  rating: { average: 0, count: 0 },
  inStock: true,
  categoryId: fixtureCategoryId,
  status: ProductStatus.DRAFT,
  attributes: null,
  variants: [
    {
      sku: 'LAN-RED',
      priceUsdCents: 1500,
      stock: 4,
      attributes: { colour: { en: 'Red', vi: 'Đỏ' } },
    },
  ],
  images: [],
  publishedAt: null,
  hiddenReason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

export const categoriesFixture = [
  {
    id: 'ca0000000000000000000001',
    slug: 'home',
    name: { en: 'Home', vi: 'Nhà cửa' },
    children: [
      {
        id: fixtureCategoryId,
        slug: 'lighting',
        name: { en: 'Lighting', vi: 'Đèn' },
        children: [],
      },
    ],
  },
];
