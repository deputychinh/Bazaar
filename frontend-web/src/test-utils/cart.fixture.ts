import type { CartLine } from '@/interfaces/cart.interface';

export const cartLineFixture = (overrides: Partial<CartLine> = {}): CartLine => ({
  sku: 'LAN-RED',
  productSlug: 'silk-lantern',
  title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
  variantLabel: 'Red',
  imageUrl: null,
  unitPriceUsdCents: 1500,
  quantity: 1,
  maxQuantity: 5,
  shop: { slug: 'hoi-an-lights', name: 'Hội An Lights' },
  ...overrides,
});
