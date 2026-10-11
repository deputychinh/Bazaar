import { cx } from './cx.util';

describe('cx', () => {
  it('joins class names with single spaces', () => {
    expect(cx('product-card', 'product-card--featured')).toBe(
      'product-card product-card--featured',
    );
  });

  it('skips false, null, undefined and empty entries', () => {
    expect(cx('button', false, null, undefined, '', 'is-busy')).toBe('button is-busy');
  });

  it('returns an empty string when nothing is set', () => {
    expect(cx(false)).toBe('');
  });
});
