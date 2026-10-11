import { productFixture } from '@/test-utils/product.fixture';

import { defaultVariant, variantLabel } from './product.util';

describe('variantLabel', () => {
  it('joins attribute values, falling back to the SKU', () => {
    expect(
      variantLabel({
        sku: 'A',
        priceUsdCents: 1,
        stock: 1,
        attributes: { color: 'Blue', size: 'M' },
      }),
    ).toBe('Blue / M');
    expect(variantLabel({ sku: 'A', priceUsdCents: 1, stock: 1, attributes: null })).toBe('A');
    expect(variantLabel({ sku: 'A', priceUsdCents: 1, stock: 1, attributes: { nested: {} } })).toBe(
      'A',
    );
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
