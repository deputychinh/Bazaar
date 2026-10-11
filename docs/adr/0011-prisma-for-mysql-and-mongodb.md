# ADR 0011 — Prisma 6.19 for both MySQL and MongoDB

- Status: Accepted
- Date: 2026-10-11
- Ticket: BZ-006 (spike)

## Context
Decision D4 picked Prisma as the one ORM for MySQL (identity, order) and MongoDB (catalog, notification).
On 2026-10-11 npm's `latest` tag points to `8.0.0-rc.22` (a release candidate), the latest stable is
**7.10.0**, and the 6.x line is at **6.19.3**. Prisma 7 requires a *driver adapter* for every database.

## Spike (run against the local compose stack)
| Check | Prisma 7.10.0 | Prisma 6.19.3 |
|---|---|---|
| MongoDB: generate client | ✔ | ✔ |
| MongoDB: connect | ✘ — "requires a driver adapter"; no MongoDB adapter is published | ✔ |
| MongoDB: create / findUnique | — | ✔ |
| MongoDB: batch + interactive transaction (replica set) | — | ✔ |
| MongoDB: `$runCommandRaw` text search | — | ✔ |
| MongoDB: atomic conditional decrement in a variant array (`$elemMatch` + `$inc`) | — | ✔ first call `n: 1`, second call `n: 0` when stock is short — no oversell |
| MySQL 8.4: `migrate diff --from-empty --script` → `schema.sql` | (adapter `@prisma/adapter-mariadb` exists) | ✔ |
| MySQL 8.4: `@default(uuid(7))` | — | ✔ version-7 UUIDs |
| MySQL 8.4: interactive transaction commit + rollback | — | ✔ |
| MySQL 8.4: unique violation | — | ✔ `P2002` |

## Decision
Use **Prisma 6.19.x (pinned exactly) in all four services**, generator `prisma-client-js`, one connection
URL per service from env. One major version everywhere keeps one way of configuring, generating and
testing. MongoDB indexes and validators live in `backend/db/<db>/schema.js` (Prisma cannot create them);
text search and the stock decrement use `$runCommandRaw` inside one repository class each.

## Consequences
- We are one major version behind on the MySQL side; Prisma 6 is still published and works with MySQL 8.4.
- Upgrade path: when a Prisma major ships MongoDB support, upgrade **all** services together in one ticket
  (re-run this spike's checks as integration tests first).
- Generated MySQL DDL uses `utf8mb4_unicode_ci`; the database default is `utf8mb4_0900_ai_ci`. The identity
  service sets the collation explicitly in its first migration (BZ-012).
- npm 11 install-script approvals needed: `prisma`, `@prisma/engines`, `@prisma/client`.
