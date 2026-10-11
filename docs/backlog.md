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
| BZ-005 | Local infrastructure | `docker-compose.yml`: MySQL 8.4, MongoDB (replica set), Redis, Kafka (KRaft) + topic init, Kafka UI, MinIO + bucket init, Mailpit; all healthy with `make up`; Kafka integration test for `nest-common` (producer → consumer → retry → DLQ) | M | ☑ |
| BZ-006 | Prisma ↔ MongoDB spike | Prove the chosen Prisma version on MySQL **and** MongoDB: CRUD, transaction, `$runCommandRaw` text search + conditional array decrement; result in ADR 0011 | M | ☑ |
| BZ-007 | `backend/db/` layout | Folder per database with README; scripts to apply `schema.*` / `data.*` (`make db-schema`, `make seed`, `make db-reset`) | S | ☑ |
| BZ-008 | Design system doc | `docs/design-system.md` — tokens (§6A.5), BEM + CSS patterns (§6A.6), contrast table | S | ☑ |
| BZ-009 | Developer docs | `README.md`, `CONTRIBUTING.md` (from §6A), `.env.example`, `Makefile` (`make help`), ADR 0001 | S | ☑ |
| BZ-010 | CI | `.github/workflows/backend.yml` (path filter `backend/**`) + `repo.yml` (commitlint, Prettier check) | S | ☑ |

## P1 — Identity + gateway
| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-011 | Gateway skeleton | Bootstrap, typed config, Prisma, Redis, `/health/ready` checks MySQL + Redis + Kafka, OpenAPI UI | M | ☑ |
| BZ-012 | Identity schema + seed | Prisma schema, first migration, generated `db/identity/schema.sql`, idempotent `data.sql` (demo password `Bazaar@2026!`) | M | ☑ |
| BZ-013 | Register + email verification | Unverified shopper created; `UserRegistered` + `EmailVerificationRequested` (link in user's locale) via outbox; one-time 24 h token. *Email delivery itself arrives with the notification service (P5); until then the link is visible in Kafka UI.* | M | ☑ |
| BZ-014 | Login, RS256 JWT, refresh, logout | argon2id, 15 min access token, JWKS, rotating httpOnly refresh cookie, reuse revokes the family | L | ☑ |
| BZ-015 | Forgot / reset password | No email enumeration; 60 min token; reset signs out everywhere | M | ☑ |
| BZ-016 | Roles + seller applications | `@Roles` + `CurrentUser`; apply / list / approve / reject; approval makes the user SELLER + `SellerApproved` | M | ☑ |
| BZ-017 | Redis rate limiting | 300/min default, 10/min on credential endpoints, 429 + Retry-After, fails open | S | ☑ |
| BZ-018 | OpenAPI export | `backend/openapi/gateway.json` generated without a database; CI fails when it or `schema.sql` is stale | M | ☑ |
| BZ-019 | Events via outbox, proven | Integration tests on MySQL + Redis + Kafka: lifecycle, seller approval, rate limit | M | ☑ |

## P2 — Catalog · P3 — Customer site · P4 — Orders + saga · P5 — Notifications + live status · P6 — Admin site · P7 — Docker + Kubernetes · P8 — AWS CDK · P9 — Observability + quality · P10 — Docs & polish
Detailed tickets are written at the start of each phase (plan §13).
