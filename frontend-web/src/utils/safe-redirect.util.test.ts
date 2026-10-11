import { safeNextPath } from './safe-redirect.util';

describe('safeNextPath', () => {
  it('keeps local paths', () => {
    expect(safeNextPath('/cart', '/account')).toBe('/cart');
    expect(safeNextPath('/search?q=silk', '/account')).toBe('/search?q=silk');
  });

  it('refuses anything that could leave the site', () => {
    for (const value of [
      '//evil.test',
      '/\\evil.test',
      'https://evil.test',
      'javascript:alert(1)',
      '',
      null,
    ]) {
      expect(safeNextPath(value, '/account')).toBe('/account');
    }
  });
});
