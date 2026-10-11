/** Port for a read-through cache (adapter: RedisCacheStore). */
export abstract class CacheStore {
  /** Returns the cached value, or loads, caches and returns it. */
  public abstract getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T>;

  public abstract delete(...keys: string[]): Promise<void>;
}
