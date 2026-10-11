import { VariantLabelUtil } from './variant-label.util.js';

describe('VariantLabelUtil', () => {
  it('joins attribute values or falls back to the SKU', () => {
    const variant = { sku: 'A', priceUsdCents: 1, stock: 1 };
    expect(VariantLabelUtil.of({ ...variant, attributes: { color: 'Blue', size: 'M' } })).toBe(
      'Blue / M',
    );
    expect(VariantLabelUtil.of({ ...variant, attributes: { nested: {} } })).toBe('A');
    expect(VariantLabelUtil.of({ ...variant, attributes: null })).toBe('A');
  });
});
