/** One dependency the service needs to be ready (database, Kafka, Redis…). */
export abstract class HealthIndicator {
  public abstract readonly name: string;

  /**
   * Whether the service must stop taking traffic while this dependency is down. Kafka is not:
   * the outbox keeps events until the broker is back (drill R2, docs/drills.md).
   */
  public readonly critical: boolean = true;

  /** Resolves when the dependency is usable; rejects otherwise. */
  public abstract check(): Promise<void>;
}
