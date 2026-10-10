/** A row of a service's outbox table/collection, ready to publish. */
export interface OutboxMessage {
  id: string;
  topic: string;
  key: string;
  value: string;
  headers: Record<string, string>;
}
