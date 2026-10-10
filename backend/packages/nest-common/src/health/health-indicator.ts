/** One dependency the service needs to be ready (database, Kafka, Redis…). */
export abstract class HealthIndicator {
  public abstract readonly name: string;

  /** Resolves when the dependency is usable; rejects otherwise. */
  public abstract check(): Promise<void>;
}
