# ADR 0005 — Order saga by Kafka choreography, with a transactional outbox

- Status: Accepted
- Date: 2026-10-11
- Plan: §7, DS-04, BZ-042..050

## Context
Placing an order touches two services and an external provider: order (MySQL), stock (catalog,
MongoDB), payment. There is no distributed transaction across them, and an event published
"after commit" is lost if the process dies between the commit and the publish.

## Decision
- **Choreography**: services react to each other's events, no central orchestrator.
  `OrderCreated` → catalog reserves stock → `StockReserved` / `StockRejected` → order charges the
  card → `OrderPaid` + `OrderConfirmed`, or `OrderCancelled` (payment failed, out of stock, timeout)
  → catalog releases the stock (`StockReleased`). A sweep job cancels orders stuck past their
  deadline, guarded by a Redis `DistributedLock` so one pod runs it.
- **Transactional outbox** in every producing service: the event row is written in the same database
  transaction as the state change; a relay publishes rows in order and marks them sent. Rows carry
  the W3C trace context, so one checkout is one trace (BZ-079).
- Topics per aggregate (`identity.events`, `order.events`, `inventory.events`, `catalog.events`),
  keyed by aggregate id so events of one order stay in order.

## Consequences
- No lost events (NFR-04): a Kafka outage only grows the outbox (drill R2); readiness therefore does
  not depend on Kafka.
- Eventual consistency: an order is `PENDING` for a moment; the UI shows live status over SSE.
- The flow is spread across services; the event map (`docs/architecture`) and traces make it readable.
