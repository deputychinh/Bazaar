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

## P2 — Catalog
| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-020 | Shared service auth + catalog skeleton | `nest-common` verifies access tokens through the gateway JWKS (`@Public`, `@Roles`, `CurrentUser` shared); catalog service boots with Prisma (MongoDB), Redis, Kafka, health on :4010 | M | ☑ |
| BZ-021 | Catalog schema + seed | Prisma models (localized `{ en, vi }` fields, variants, images), `db/catalog/schema.js` (validators + text/unique/compound indexes), deterministic `data.js` (categories, 3 shops, 1,000 products) | L | ☑ |
| BZ-022 | Shops via Kafka | `SellerApproved` → shop created (idempotent consumer, slug from Vietnamese names); public shop page data; seller edits own shop | M | ☑ |
| BZ-023 | Categories | Category tree with EN/VI names, public read | S | ☑ |
| BZ-024 | Public catalog + search | List with filters (category, price range in USD cents, rating), sort (newest, price, rating), page/pageSize + total, full-text search in EN and VI; product detail by slug; only published products | L | ☑ |
| BZ-025 | Seller products | Create / update / publish / hide own products, variants with stock; `ProductPublished/Updated/Hidden` via the Mongo outbox | L | ☑ |
| BZ-026 | Product images | Presigned upload to object storage (S3 API), size/type checks, attach/remove image | M | ☑ |
| BZ-027 | Redis read cache | Product detail and category tree cached; invalidated when a product changes | S | ☑ |
| BZ-028 | Admin moderation | Admin hides / restores any product, with a reason | S | ☑ |
| BZ-029 | Gateway routes + contract | Gateway forwards catalog routes (rate limit applies); `backend/openapi/catalog.json` exported and checked in CI | M | ☑ |
| BZ-030 | Catalog integration tests | Real MongoDB/Redis/Kafka/storage: seller approval → shop, product lifecycle → events, search, upload, cache | M | ☑ |

## P3 — Customer site (Next.js)
| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-031 | FX rates in the gateway | `GET /api/v1/fx-rates`; HTTP + static providers behind `FxRateProvider`; Redis cache 1 h; stale value served when the provider fails (ADR 0012) | M | ☑ |
| BZ-032 | `frontend-web` scaffold | Next.js 16 + React 19 + TypeScript strict; ESLint (arrow functions only, no classes, a11y, hooks), Stylelint (BEM, tokens only), Vitest + Testing Library; design tokens and base/layout CSS from `docs/design-system.md` | M | ☑ |
| BZ-033 | Typed API client | `src/api/*.schema.ts` generated from `backend/openapi/*.json` (openapi-typescript), `openapi-fetch` clients, freshness check | S | ☑ |
| BZ-034 | Bilingual routing | next-intl `/en` `/vi`, locale redirect, typed messages with key-parity test, error codes translated, `hreflang` | M | ☑ |
| BZ-035 | Layout and UI primitives | Header (locale + currency switch), footer, Button, Price (USD/VND), ProductCard, Pagination, empty/error states — BEM | M | ☑ |
| BZ-036 | Landing pages (SSG) | Home, pricing, about, sell — statically generated in both languages | M | ☑ |
| BZ-037 | Catalog pages (SSR) | Category and search pages with filters, sort and pagination from the URL | L | ☑ |
| BZ-038 | Product page (SSR + ISR) | Variants, gallery, stock, shop link, metadata + JSON-LD, revalidate endpoint protected by a secret | M | ☑ |
| BZ-039 | Cart | Client cart (context + localStorage), cart page with totals in USD cents converted once | M | ☑ |
| BZ-040 | Account pages | Register, verify email, login, forgot/reset password; access token in memory, refresh cookie same-origin through a rewrite | L | ☑ |
| BZ-041 | Quality gates | `web.yml` CI (lint, types, tests, build, schema freshness), `check-tokens.mjs`, Lighthouse ≥ 90 on landing and product pages | M | ◐ |

## P4 — Orders + saga · P5 — Notifications + live status · P6 — Admin site · P7 — Docker + Kubernetes · P8 — AWS CDK · P9 — Observability + quality · P10 — Docs & polish
Detailed tickets are written at the start of each phase (plan §13).
