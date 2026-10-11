import { DistributedLock } from './distributed-lock.js';

/** Test double: a lock held in this process only. */
export class InMemoryDistributedLock extends DistributedLock {
  private readonly held = new Set<string>();

  public async runExclusive(
    key: string,
    _ttlMs: number,
    work: () => Promise<void>,
  ): Promise<boolean> {
    if (this.held.has(key)) return false;
    this.held.add(key);
    try {
      await work();
    } finally {
      this.held.delete(key);
    }
    return true;
  }
}
