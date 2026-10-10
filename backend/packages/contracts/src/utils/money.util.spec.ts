import { MoneyUtil } from './money.util.js';

describe('MoneyUtil', () => {
  it('multiplies a unit price by the quantity', () => {
    expect(MoneyUtil.lineTotal(1250, 3)).toBe(3750);
  });

  it('rejects a quantity that is not a positive integer', () => {
    expect(() => MoneyUtil.lineTotal(1250, 0)).toThrow(RangeError);
    expect(() => MoneyUtil.lineTotal(1250, 1.5)).toThrow(RangeError);
  });

  it('sums amounts of cents', () => {
    expect(MoneyUtil.sum([100, 250, 5])).toBe(355);
    expect(MoneyUtil.sum([])).toBe(0);
  });

  it('rejects fractional or negative cents', () => {
    expect(() => MoneyUtil.assertCents(10.5)).toThrow(RangeError);
    expect(() => MoneyUtil.assertCents(-1)).toThrow(RangeError);
    expect(() => MoneyUtil.sum([100, -5])).toThrow(RangeError);
  });
});
