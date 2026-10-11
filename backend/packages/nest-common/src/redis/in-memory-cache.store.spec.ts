import { InMemoryCacheStore } from './in-memory-cache.store.js';

describe('InMemoryCacheStore', () => {
  it('loads once, then serves the cached JSON until deleted', async () => {
    const cache = new InMemoryCacheStore();
    const load = vi.fn().mockResolvedValue({ name: 'Gốm' });

    await cache.getOrSet('k', 60, load);
    const second = await cache.getOrSet('k', 60, load);
    await cache.delete('k');
    await cache.getOrSet('k', 60, load);

    expect(second).toEqual({ name: 'Gốm' });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
