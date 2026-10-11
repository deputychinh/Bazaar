import { VariantLabelUtil } from './variant-label.util.js';

describe('VariantLabelUtil', () => {
  const variant = { sku: 'A', priceUsdCents: 1, stock: 1 };

  it('joins plain and localized attribute values in both languages', () => {
    expect(
      VariantLabelUtil.of({
        ...variant,
        attributes: { colour: { en: 'Indigo', vi: 'Chàm' }, size: 'M' },
      }),
    ).toEqual({ en: 'Indigo / M', vi: 'Chàm / M' });
    expect(VariantLabelUtil.of({ ...variant, attributes: { colour: { en: 'Red' } } })).toEqual({
      en: 'Red',
      vi: 'Red',
    });
  });

  it('falls back to the SKU', () => {
    expect(VariantLabelUtil.of({ ...variant, attributes: { nested: { deep: 1 } } })).toEqual({
      en: 'A',
      vi: 'A',
    });
    expect(VariantLabelUtil.of({ ...variant, attributes: null })).toEqual({ en: 'A', vi: 'A' });
  });
});
