import { productFixture } from '@/test-utils/product.fixture';

import { defaultVariant, variantLabel } from './product.util';

describe('variantLabel', () => {
  const variant = { sku: 'A', priceUsdCents: 1, stock: 1 };

  it('joins plain and localized attribute values in both languages', () => {
    expect(
      variantLabel({ ...variant, attributes: { colour: { en: 'Indigo', vi: 'Chàm' }, size: 'M' } }),
    ).toEqual({ en: 'Indigo / M', vi: 'Chàm / M' });
    expect(variantLabel({ ...variant, attributes: { colour: { en: 'Red' } } })).toEqual({
      en: 'Red',
      vi: 'Red',
    });
  });

  it('falls back to the SKU', () => {
    expect(variantLabel({ ...variant, attributes: null })).toEqual({ en: 'A', vi: 'A' });
    expect(variantLabel({ ...variant, attributes: { nested: {} } })).toEqual({ en: 'A', vi: 'A' });
  });
});

describe('defaultVariant', () => {
  it('prefers a variant in stock', () => {
    const [red, blue] = productFixture().variants;
    expect(defaultVariant([blue!, red!])?.sku).toBe('LAN-RED');
    expect(defaultVariant([blue!])?.sku).toBe('LAN-BLUE');
    expect(defaultVariant([])).toBeUndefined();
  });
});
