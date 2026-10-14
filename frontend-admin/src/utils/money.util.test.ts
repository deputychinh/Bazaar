import { centsToDollars, dollarsToCents, formatUsd } from './money.util';

describe('money', () => {
  it('converts typed dollars to cents and back', () => {
    expect(dollarsToCents('12.5')).toBe(1250);
    expect(dollarsToCents(' 12,05 ')).toBe(1205);
    expect(dollarsToCents('12.345')).toBeNull();
    expect(dollarsToCents('abc')).toBeNull();
    expect(centsToDollars(1250)).toBe('12.50');
  });

  it('formats USD per language', () => {
    expect(formatUsd(1250, 'en')).toBe('$12.50');
    expect(formatUsd(1250, 'vi')).toMatch(/12,50\sUS\$/);
  });
});
