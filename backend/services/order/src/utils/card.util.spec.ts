import { CardUtil } from './card.util.js';

describe('CardUtil', () => {
  it('accepts Luhn-valid numbers, including the provider test cards', () => {
    for (const number of [
      '4242424242424242',
      '4000000000000002',
      '4000000000000119',
      '5555555555554444',
    ]) {
      expect(CardUtil.isValidNumber(number)).toBe(true);
    }
  });

  it('refuses wrong checksums and malformed input', () => {
    for (const number of ['4242424242424241', '1234', '4242-4242-4242-4242', '']) {
      expect(CardUtil.isValidNumber(number)).toBe(false);
    }
  });

  it('keeps only the last four digits for display', () => {
    expect(CardUtil.last4('4242424242424242')).toBe('4242');
  });
});
