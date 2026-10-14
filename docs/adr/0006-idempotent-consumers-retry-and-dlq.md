# ADR 0006 — Idempotent consumers, retry topic and dead-letter topic

- Status: Accepted
- Date: 2026-10-11
- Plan: §7.3, BZ-022..024

## Context
The outbox gives at-least-once delivery: after a crash or a rebalance a consumer can see the same
event twice. Handlers can also fail — a database briefly away, a bug, or a message that cannot be
parsed at all.

## Decision
- **Idempotent handlers**: each service records processed event ids (`processed_events`, primary key
  = event id) in the same transaction as the effect; a duplicate is skipped, so effects apply once.
- **Retry topic**: a failing handler re-publishes the message to `<topic>.retry` with an increasing
  `delivery-attempt` header; consumers subscribe to both. After `MAX_DELIVERY_ATTEMPTS` (5) the
  message goes to **`<topic>.dlq`** with the reason in the `error` header. Unparseable messages go to
  the DLQ at once.
- Metrics count consumed messages by outcome (handled / ignored / retried / dead_lettered); an alert
  fires on any dead letter; the runbook describes inspection and replay.

## Consequences
- A poison message never blocks a partition (drill R4); replaying from the DLQ is safe because
  handlers are idempotent.
- Ordering per key holds on the normal path, not across a retry: handlers must tolerate an older event
  arriving after a newer one (the state machines reject invalid transitions).
