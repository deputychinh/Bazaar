import { CacheStore } from './cache-store.js';

/** Test double: a cache that lives in memory (no TTL). */
export class InMemoryCacheStore extends CacheStore {
  public readonly entries = new Map<string, string>();

  public async getOrSet<T>(key: string, _ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached !== undefined) {
      return JSON.parse(cached) as T;
    }
    const value = await load();
    this.entries.set(key, JSON.stringify(value));
    return value;
  }

  public delete(...keys: string[]): Promise<void> {
    keys.forEach((key) => this.entries.delete(key));
    return Promise.resolve();
  }
}
