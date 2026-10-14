/** What happened to one consumed Kafka message (label of kafka_messages_consumed_total). */
export enum ConsumeOutcome {
  Handled = 'handled',
  Ignored = 'ignored',
  Retried = 'retried',
  DeadLettered = 'dead_lettered',
}
