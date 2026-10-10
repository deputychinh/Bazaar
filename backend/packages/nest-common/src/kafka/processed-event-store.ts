/**
 * Idempotency port (plan DS-05). Each service implements it with its own database so
 * "mark event as processed" and the handler's writes commit in one transaction.
 */
export abstract class ProcessedEventStore<TTransaction = unknown> {
  /** Runs `work` once per event id; returns false when the event was already processed. */
  public abstract runOnce(
    eventId: string,
    work: (transaction: TTransaction) => Promise<void>,
  ): Promise<boolean>;
}
