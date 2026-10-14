# Resilience drills

Plan §0.3. Run on staging (kind, 2026-10-14, release `f67e97c` unless noted) with the observability
stack installed. Each drill: what was done, what was seen, what changed because of it.

| # | Drill | Result |
|---|---|---|
| R1 | Kill the order pod mid-checkout | ✅ no lost or duplicate order |
| R2 | Kafka broker down under load | ✅ after a fix — the first run took the API down |
| R3 | 50 buyers, last 5 items | ✅ exactly 5 confirmed, stock 0 |
| R4 | Poison message on `order.events` | ✅ DLQ + alert — after fixing the alert rule |
| R5 | Rolling update with a broken release | ✅ old pod kept serving, `rollout undo` |
| R6 | Load past the HPA threshold | ✅ 1 → 3 replicas, no failed request |
| R7 | Expand/contract migration | procedure below (not run) |
| R8 | Restore MySQL + Mongo from backup | procedure below (not run) |

## R1 — Kill the order pod mid-checkout
- **Done**: `k6 run loadtest/checkout.js` (2 orders/s for 60 s); after 20 s
  `kubectl -n bazaar delete pod -l app.kubernetes.io/name=order`.
- **Seen**: 121/121 checkouts answered 201 or 409 (sold out); the replacement pod was ready while the
  old one drained (preStop + graceful shutdown), so not one request failed. All 100 orders created
  during the drill ended `CONFIRMED`; no duplicate `(shopper, idempotency key)`.
- **Changed**: nothing.

## R2 — Kafka broker down
- **Done**: checkout at 1 order/s; `kubectl -n bazaar-data delete pod bazaar-dual-0` (Strimzi brings
  the broker back in ~30 s).
- **Seen (first run, release 705f2ff)**: the outbox did its job — backlog grew to 11 messages, oldest
  20 s, drained to 0 as soon as the broker returned, every order ended `CONFIRMED`. **But** 36
  checkouts failed with 503: Kafka was part of `/health/ready`, so every gateway and catalog pod left
  the endpoints while the broker was away.
- **Changed**: health indicators have a `critical` flag; Kafka is not critical — `/health/ready`
  answers 200 `degraded` while it is down. Readiness probes got a 4 s timeout (one check may take 3 s).
- **Seen (rerun, f67e97c)**: the API answered 200 throughout; health went `degraded` → `up`; all
  77 orders `CONFIRMED`, 13 checkouts 409 (sold out), no failure.

## R3 — 50 concurrent buyers for the last 5 items
- **Done**: `k6 run loadtest/last-items.js` — creates a product with stock 5, then 50 checkouts at once.
- **Seen**: 50/50 answered; **exactly 5 orders `CONFIRMED`**, 45 `CANCELLED` / `OUT_OF_STOCK` by the
  saga, variant stock 0 (atomic conditional decrement, NFR-05).
- **Changed**: nothing.

## R4 — Poison message
- **Done**: `echo 'this is not an event' | kafka-console-producer.sh --topic order.events`.
- **Seen**: gateway and notification could not parse it and wrote it to `order.events.dlq` with the
  reason in the `error` header (`event sent to dead-letter topic` in their logs). **The
  `DeadLetterNotEmpty` alert did not fire**: the counter series is created by the first dead letter
  and `increase()` cannot see a series' first step.
- **Changed**: the rule also fires on dead-letter series born in the last 15 minutes; the dashboard
  shows the counter since pod start. Re-checked: alert emails for gateway and notification arrived in
  Mailpit. Replay steps: [runbook → DeadLetterNotEmpty](runbook.md#deadletternotempty).

## R5 — Rolling update with a broken release
- **Done**: `kubectl -n bazaar set env deployment/catalog CATALOG_DATABASE_URL=mongodb://nowhere.invalid…`.
- **Seen**: the new pod never became ready; with `maxUnavailable: 0` the old pod kept serving —
  the catalog API answered 200 for the whole minute. `kubectl rollout undo deployment/catalog`
  restored the previous ReplicaSet.
- **Changed**: noted in the runbook flow: after an emergency `rollout undo`, re-run `make release`
  (or prefer `make rollback TAG=<sha>`) so the applied manifests match the cluster again.

## R6 — Load past the HPA threshold
- **Done**: `SCENARIOS=api-reads RATE=400 DURATION=3m make load-test`.
- **Seen**: HPA scaled gateway and catalog 1 → 3 within the first minute; 72,004 requests, 0 failed,
  p95 23.8 ms, p99 57.6 ms (Grafana *Bazaar · Services* shows the step). Scale-down followed 5 minutes
  after the load stopped.
- **Changed**: nothing; `maxReplicas` 3 is a laptop limit, the AWS overlay uses 2–6.

## R7 — Breaking schema change, expand/contract (procedure)
Example: rename `orders.shipping_name` to `recipient_name` without downtime.
1. **Expand** (release N): migration adds `recipient_name` (nullable); code writes both columns and
   reads the new one with a fallback to the old.
2. **Backfill** (one-off Job, idempotent, in batches): copy old → new where new is null.
3. **Switch** (release N+1): code reads and writes only the new column. Rolling back to N still works —
   N writes both.
4. **Contract** (release N+2, after N+1 has run long enough to make rollback to N unnecessary):
   migration drops the old column.
Rules: never rename or drop in the same release that stops using a column; migrations only move
forward (`make rollback` redeploys images, never schema).

## R8 — Restore MySQL and MongoDB into a fresh cluster (procedure)
Staging:
1. Back up: `kubectl -n bazaar-data exec mysql-0 -- mysqldump --single-transaction --routines
   -uroot -p"$MYSQL_ROOT_PASSWORD" --databases bazaar_identity bazaar_order > mysql.sql` and
   `kubectl -n bazaar-data exec mongo-0 -- mongodump --archive --gzip > mongo.archive.gz`; copy both
   to the `bazaar-backups` bucket.
2. New cluster: `make k8s-up`, then scale the apps to 0 (`kubectl -n bazaar scale deploy --all --replicas=0`).
3. Restore: `kubectl -n bazaar-data exec -i mysql-0 -- mysql -uroot -p… < mysql.sql` and
   `kubectl -n bazaar-data exec -i mongo-0 -- mongorestore --archive --gzip --drop < mongo.archive.gz`.
4. Scale the apps back (`make release`); outbox rows not yet sent are relayed on start, consumers are
   idempotent, so events in flight at backup time are delivered at least once and applied once.
AWS: Aurora point-in-time restore to a new cluster, Atlas continuous backup restore; then point the
`bazaar/<env>/endpoints/*` parameters and secrets at the restored stores and roll the apps.
