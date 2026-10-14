/** Unsent outbox messages, for the backlog gauges (alert: oldest unsent > 60 s, plan §9.3). */
export interface OutboxBacklog {
  count: number;
  oldestCreatedAt: Date | null;
}
