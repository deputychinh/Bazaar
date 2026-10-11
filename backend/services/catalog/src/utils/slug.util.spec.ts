import { SlugUtil } from './slug.util.js';

describe('SlugUtil', () => {
  it.each([
    ['Gốm Minh Long', 'gom-minh-long'],
    ['Đồ gỗ Đà Nẵng', 'do-go-da-nang'],
    ["Anna's Studio", 'anna-s-studio'],
    ['  Lụa   Hà Đông!! ', 'lua-ha-dong'],
  ])('turns %s into %s', (text, expected) => {
    expect(SlugUtil.from(text)).toBe(expected);
  });

  it('adds a number until the slug is free', async () => {
    const taken = new Set(['lua-lan', 'lua-lan-2']);

    await expect(
      SlugUtil.unique('lua-lan', (slug) => Promise.resolve(taken.has(slug))),
    ).resolves.toBe('lua-lan-3');
    await expect(SlugUtil.unique('new-shop', () => Promise.resolve(false))).resolves.toBe(
      'new-shop',
    );
  });
});
