import { DisplayCurrency, Locale } from '@/api/gateway.schema';

import { formatPrice, sumUsdCents } from './money.util';

const normalize = (text: string): string => text.replace(/\s/g, ' ');

describe('formatPrice', () => {
  it('shows USD from cents', () => {
    expect(
      formatPrice({
        usdCents: 1250,
        currency: DisplayCurrency.USD,
        locale: Locale.en,
        usdToVnd: 25_000,
      }),
    ).toBe('$12.50');
  });

  it('shows VND as an approximate amount in whole đồng', () => {
    const vnd = formatPrice({
      usdCents: 1250,
      currency: DisplayCurrency.VND,
      locale: Locale.vi,
      usdToVnd: 25_431.5,
    });

    // 12.50 × 25,431.5 = 317,893.75 → 317,894 đồng
    expect(normalize(vnd)).toBe('≈ 317.894 ₫');
  });

  it('falls back to USD when no rate is available', () => {
    expect(
      formatPrice({
        usdCents: 900,
        currency: DisplayCurrency.VND,
        locale: Locale.vi,
        usdToVnd: null,
      }),
    ).toContain('US$');
  });
});

describe('sumUsdCents', () => {
  it('adds amounts in cents (convert once, after summing)', () => {
    expect(sumUsdCents([1250, 999, 1])).toBe(2250);
    expect(sumUsdCents([])).toBe(0);
  });
});
