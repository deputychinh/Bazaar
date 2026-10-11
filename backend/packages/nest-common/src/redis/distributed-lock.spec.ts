import { InMemoryDistributedLock } from './in-memory-distributed-lock.js';

describe('InMemoryDistributedLock', () => {
  it('lets one holder run at a time and frees the lock afterwards, even on failure', async () => {
    const lock = new InMemoryDistributedLock();
    let inner: boolean | undefined;

    const outer = await lock.runExclusive('job', 1000, async () => {
      inner = await lock.runExclusive('job', 1000, () => Promise.resolve());
    });
    expect([outer, inner]).toEqual([true, false]);

    await expect(
      lock.runExclusive('job', 1000, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(await lock.runExclusive('job', 1000, () => Promise.resolve())).toBe(true);
  });
});
