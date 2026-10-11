/**
 * Port: run work while holding a lock shared by every pod, so a scheduled job runs on one pod
 * at a time. Returns false (and skips the work) when another holder has the lock.
 */
export abstract class DistributedLock {
  public abstract runExclusive(
    key: string,
    ttlMs: number,
    work: () => Promise<void>,
  ): Promise<boolean>;
}
