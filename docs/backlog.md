# Bazaar — Backlog

Ticket ids `BZ-xxx`. One Conventional Commit per finished ticket on `main` (plan §0.3).
Size: S (< 2 h) · M (half day) · L (1 day+). Status: ☐ todo · ◐ doing · ☑ done.

## P0 — Foundation
| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-001 | Backlog + repo tooling | `docs/backlog.md`; root `package.json` (tooling only), Prettier, EditorConfig, Husky pre-commit (lint-staged) + commit-msg (commitlint) | S | ☑ |
| BZ-002 | Backend workspace | `backend/` npm workspaces + Turborepo, shared `tsconfig.base.json`, ESLint config enforcing §6A (enum/constant/interface files, classes only), ESM, shared Vitest config | M | ☑ |
| BZ-003 | `@bazaar/contracts` | Enums (one per file), constants, interfaces, event envelope + payload types, zod schemas, `EventFactory`; unit tests ≥ 80 % | M | ☑ |
| BZ-004 | `@bazaar/nest-common` | `AppConfigLoader` (zod env), logger module (pino), health module (live/ready + pluggable checks), `DomainError` + problem-details filter, Kafka `EventProducer`/`EventConsumer` (Confluent client), `OutboxRelay`, `BaseEventHandler` + idempotency port; unit tests | L | ☑ |
| BZ-005 | Local infrastructure | `docker-compose.yml`: MySQL 8.4, MongoDB (replica set), Redis, Kafka (KRaft) + topic init, Kafka UI, MinIO + bucket init, Mailpit; all healthy with `make up`; Kafka integration test for `nest-common` (producer → consumer → retry → DLQ) | M | ☐ |
| BZ-006 | Prisma ↔ MongoDB spike | Prove the chosen Prisma version on MySQL **and** MongoDB: CRUD, transaction, `$runCommandRaw` text search + conditional array decrement; result in ADR 0011 | M | ☐ |
| BZ-007 | `backend/db/` layout | Folder per database with README; scripts to apply `schema.*` / `data.*` (`make db-schema`, `make seed`, `make db-reset`) | S | ☐ |
| BZ-008 | Design system doc | `docs/design-system.md` — tokens (§6A.5), BEM + CSS patterns (§6A.6), contrast table | S | ☐ |
| BZ-009 | Developer docs | `README.md`, `CONTRIBUTING.md` (from §6A), `.env.example`, `Makefile` (`make help`), ADR 0001 | S | ☐ |
| BZ-010 | CI | `.github/workflows/backend.yml` (path filter `backend/**`) + `repo.yml` (commitlint, Prettier check) | S | ☐ |

## P1 — Identity + gateway
| Id | Ticket | Size |
|---|---|---|
| BZ-011 | Gateway service skeleton (bootstrap, config, health, logger, problem details) | M |
| BZ-012 | Identity schema (`db/identity/schema.sql`, Prisma) + `data.sql` seed | M |
| BZ-013 | Register + email verification (Mailpit) | M |
| BZ-014 | Login, RS256 JWT, rotating refresh cookie, logout | L |
| BZ-015 | Forgot / reset password | M |
| BZ-016 | Roles guard, `CurrentUser`, seller application + admin approval | M |
| BZ-017 | Redis rate limiting | S |
| BZ-018 | OpenAPI export to `backend/openapi/gateway.json` + freshness check | M |
| BZ-019 | `UserRegistered` / `SellerApproved` events via outbox | M |

## P2 — Catalog · P3 — Customer site · P4 — Orders + saga · P5 — Notifications + live status · P6 — Admin site · P7 — Docker + Kubernetes · P8 — AWS CDK · P9 — Observability + quality · P10 — Docs & polish
Detailed tickets are written at the start of each phase (plan §13).
