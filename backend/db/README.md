# backend/db — schema and seed files

One folder per database; plain files you can read and diff (plan §7.4).

| Folder | Database | Engine | Files |
|---|---|---|---|
| `identity/` | `bazaar_identity` | MySQL 8.4 | `schema.sql` · `data.sql` |
| `order/` | `bazaar_order` | MySQL 8.4 | `schema.sql` · `data.sql` |
| `catalog/` | `bazaar_catalog` | MongoDB 8 | `schema.js` · `data.js` |
| `notification/` | `bazaar_notification` | MongoDB 8 | `schema.js` |

## What each file is
- **`schema.sql` (MySQL)** — the full current DDL in one file. It is **generated** from the service's Prisma
  schema (`prisma migrate diff --from-empty --to-schema-datamodel --script`) and CI fails when it is stale.
  Tables are created by Prisma migrations (`make migrate`), which keep the change history in
  `services/<service>/prisma/migrations/`. Read `schema.sql` to see the whole database at a glance.
- **`data.sql` (MySQL)** — hand-written seed data, idempotent (`INSERT … ON DUPLICATE KEY UPDATE`).
- **`schema.js` (MongoDB)** — collections, JSON-Schema validators and every index (text, unique, compound, TTL).
  Prisma cannot create these for MongoDB, so this file is the single place they are defined. Idempotent.
- **`data.js` (MongoDB)** — deterministic seed (fixed ids), idempotent upserts.

## Commands (from the repo root)
| Command | Does |
|---|---|
| `make migrate` | Apply Prisma migrations to the MySQL databases |
| `make db-schema` | Apply every `schema.js` (MongoDB collections, validators, indexes) |
| `make seed` | Load every `data.sql` and `data.js` |
| `make db-reset` | Drop all Bazaar databases, then `migrate` + `db-schema` + `seed` |

The same files are used by docker compose, the kind seed Jobs (P7) and integration tests.
