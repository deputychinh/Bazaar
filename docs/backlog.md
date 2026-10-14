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
| BZ-041 | Quality gates | `web.yml` CI (lint, types, tests, build, schema freshness), `check-tokens.mjs`, Lighthouse ≥ 90 on landing and product pages | M | ☑ |

## P4 — Orders + Kafka saga
Checkout is orchestrated by the gateway (allowed sync path, DS-03): it asks the catalog for an
authoritative quote (price, seller, availability), then creates the order with priced lines. Stock is
reserved asynchronously through the saga (plan §5.3). Internal routes (`/internal/*`) are never proxied
and need the shared `INTERNAL_API_KEY` plus the shopper's JWT.

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-042 | Order service scaffold | NestJS service on :4020 like catalog: Prisma (MySQL `bazaar_order`: orders, seller_orders, order_items, payments, outbox, processed_events), migration + generated `db/order/schema.sql`, health (MySQL, Redis, Kafka), outbox relay, OpenAPI export, `make dev-order`, CI | M | ☑ |
| BZ-043 | Internal API guard + catalog quote | `@Internal()` routes + `InternalApiGuard` (constant-time key check) in nest-common; catalog `POST /internal/v1/quote` returns price, seller, shop, title, stock for cart lines or a per-line problem | M | ☑ |
| BZ-044 | Checkout | Gateway `POST /api/v1/orders` (Idempotency-Key required, replay returns the same order): quote → order `POST /internal/v1/orders` → Order PENDING + one SellerOrder per seller + items + payment intent (fake tokenised card) + `OrderCreated`, one MySQL transaction | L | ☑ |
| BZ-045 | Stock reservation | Catalog consumes `OrderCreated` → conditional decrement of every line in one Mongo transaction → `StockReserved` or `StockRejected` (nothing kept); consumes `OrderCancelled` / `SellerOrderCancelled` → release once → `StockReleased` | M | ☑ |
| BZ-046 | Payment + confirmation | Order consumes `StockReserved` → RESERVED → fake provider charge (test cards: decline, timeout, success) → PAID → CONFIRMED (+ seller orders CONFIRMED) or CANCELLED(PAYMENT_FAILED); `StockRejected` → CANCELLED(OUT_OF_STOCK); state machine unit-tested | M | ☑ |
| BZ-047 | Reservation timeout | Scheduled job in order (single runner via Redis lock) cancels orders still PENDING/RESERVED after 15 min with RESERVATION_TIMEOUT | S | ☑ |
| BZ-048 | Orders API + fulfilment | Shopper: list/detail own orders, cancel a seller order before SHIPPED. Seller: list own seller orders, ship, deliver. Order COMPLETED when every seller order is final; events for each change | M | ☑ |
| BZ-049 | Web checkout + my orders | Checkout page (test card), order page with status (polling until P5 SSE), orders list; cart cleared after order; EN/VI | M | ☑ |
| BZ-050 | Saga quality | Integration tests: happy path, out of stock, payment declined, timeout; concurrent orders on the last items never oversell; poison message lands in DLQ | M | ☑ |

## P5 — Notifications + live status
The notification service (MongoDB) consumes every topic: it keeps the event log, a contact book of
users (email + language, from identity events; seeded users come from `db/notification/data.js`),
sends emails through SMTP (Mailpit locally) and stores in-app notifications. The gateway pushes
order changes to the shopper over SSE.

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-051 | Notification service scaffold | NestJS on :4030, Prisma on MongoDB `bazaar_notification` (contacts, notifications with 180-day TTL, event_log, processed_events), `db/notification/schema.js` + `data.js`, consumer of identity/order/inventory/catalog events, every event appended to the log once, health | M | ☑ |
| BZ-052 | Emails | `EmailSender` port + SMTP adapter; EN/VI templates in the user's language: verify email, reset password, order confirmed/cancelled, seller order shipped/delivered (shopper), new order (seller); amounts in USD with a "charged in USD" note (no FX call from this service, DS-03); queued with the event, sent once by a relay with retries | M | ☑ |
| BZ-053 | In-app notifications | Notification per order event for shopper and seller; `GET /notifications` (mine, unread count), mark one / all read; proxied by the gateway; web bell with unread badge | M | ☑ |
| BZ-054 | Live order status (SSE) | Gateway reads `order.events` with a per-pod consumer group and streams the signed-in shopper's order changes (`GET /api/v1/orders/stream`); order page updates live, polling only as fallback | M | ☑ |
| BZ-055 | Reviews | Catalog learns deliveries from `SellerOrderDelivered`; shopper reviews a delivered product once; rating summary recomputed with `RatingUpdated`; product page lists reviews and offers the form when allowed | L | ☑ |
| BZ-056 | Event log + ISR hook | Admin `GET /admin/events` (filter by type / aggregate); product changes and new ratings revalidate the product page on the web (shared secret) | S | ☑ |

## P6 — Admin site (SPA)
`frontend-admin/` is its own project (Vite, React 19, React Router, TanStack Query, react-i18next) with
the same conventions as the web (arrow functions, BEM, tokens). It calls `/api` on its own origin, proxied
to the gateway (Vite dev server locally, the ingress in Kubernetes), so the refresh cookie stays first-party.

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-057 | Admin scaffold | Vite + React 19 + TS strict, React Router, TanStack Query, react-i18next EN/VI; ESLint/Stylelint as the web; tokens identical to the web (`check-tokens.mjs` covers both); Vitest + RTL; API types generated; `admin.yml` CI | M | ☑ |
| BZ-058 | Auth and shell | Sign-in, in-memory access token, one 401 → refresh → retry path, role-guarded areas (`/seller`, `/platform`, lazy-loaded), layout and navigation, language kept in settings | M | ☑ |
| BZ-059 | Seller products | List with URL pagination/filter, create and edit with React Hook Form + zod (EN/VI text, variants, stock), publish/unpublish, image upload through a presigned URL | L | ☑ |
| BZ-060 | Seller orders | Queue by status, ship and deliver actions, list refreshes on its own | M | ☑ |
| BZ-061 | Stats + dashboards | Order service: seller sales per day and order counts, platform GMV / orders by status / top sellers; seller and platform dashboards with a simple chart | M | ☑ |
| BZ-062 | Platform admin | Seller applications approve/reject, product moderation list (catalog admin list) with hide/restore, event log viewer | M | ☑ |
| BZ-063 | Journeys | Playwright: seller (sign in → create product → publish → ship an order) and admin (approve seller → hide product) against the running stack | M | ☑ |

## P7 — Docker + Kubernetes
Goal: `make k8s-up` → the whole marketplace reachable at `http://bazaar.localhost` and `http://admin.bazaar.localhost` on a local kind cluster (staging, plan §0.2).

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-064 | Service images | One multi-stage Dockerfile for the four NestJS services (`turbo prune`, `npm ci`, build, prod-only deps, Prisma engines for linux arm64 + amd64), non-root, `tini`, `HEALTHCHECK`; web image from Next.js `standalone` output; admin image = static build on nginx-unprivileged with SPA fallback and `/api` left to the ingress; `.dockerignore`; `make images` tags every image with the git sha | M | ☑ |
| BZ-065 | Compose full profile | `docker compose --profile full up` adds migrate/seed one-shot jobs and all six apps (env from `.env`, in-network hosts); admin and web served the same way as in the cluster (`/api` → gateway); `make up-full`; the Playwright journeys pass against it | M | ☑ |
| BZ-066 | kind cluster | `infra/k8s/kind/kind-config.yaml` (1 control-plane + 2 workers, 80/443 mapped), local registry `localhost:5001`, Helm installs Traefik, metrics-server and the Strimzi operator (pinned chart versions); `make k8s-up / k8s-down / k8s-status / k8s-load` | M | ☑ |
| BZ-067 | Kustomize base | `infra/k8s/base`: Namespace, Deployment + Service + ConfigMap per app, Secrets from `secretGenerator`, liveness/readiness probes, resource requests/limits, `securityContext` (non-root, read-only root fs where possible), Traefik Ingress (`bazaar.localhost` → web, `admin.bazaar.localhost` → admin, `/api` on both → gateway, `TRUST_PROXY_HOPS=1`); NetworkPolicy: only the gateway reaches services' internal routes | L | ☑ |
| BZ-068 | Data stores (local overlay) | `overlays/local`: MySQL, MongoDB (single-node replica set), Redis, RustFS, Mailpit as StatefulSets with PVCs in `bazaar-data`; Strimzi `Kafka` + `KafkaNodePool` (KRaft, 1 node) and one `KafkaTopic` per topic in `contracts`; `check-topics.mjs` also checks the KafkaTopic files | L | ☑ |
| BZ-069 | Jobs, rollout, scaling | Migration Job (Prisma `migrate deploy` + Mongo `schema.js`) and seed Job run before the apps (init containers wait for them); bucket Job; HPA on gateway and catalog (CPU 70 %), PDB for services; rolling update `maxUnavailable: 0`; `make release` / `make rollback` | M | ☑ |
| BZ-070 | Image + cluster CI | `images.yml`: build images, Trivy scan (fail on HIGH/CRITICAL with a fix); `k8s-smoke.yml`: kind cluster, local overlay, rollout status, curl health through the ingress; ADR 0007 (Kustomize + kind + Strimzi); `docs/k8s.md` how-to | M | ☑ |

## P8 — AWS CDK (prod, written and tested, never deployed)
Goal: `make aws-test aws-synth` → every stack synthesizes for dev and prod, Vitest assertions and cdk-nag pass, with no AWS account (plan §9A).

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-071 | CDK scaffold | `infra/cdk` own package (aws-cdk-lib, constructs, cdk-nag, Vitest), `bin/bazaar.ts` builds stacks per environment from one typed `lib/config/environments.ts` (dev, prod: sizes, AZs, retention, deletion protection), tags `project/env/owner` on everything, cdk-nag AwsSolutions on every synth (each suppression with a reason), `make aws-synth / aws-test`, `cdk.yml` CI; first stack `CiStack`: ECR repo per app (scan on push, immutable tags, lifecycle), GitHub OIDC provider + least-privilege deploy role (no access keys) | M | ☑ |
| BZ-072 | Network stack | VPC over 3 AZs (public / private / isolated), NAT 1 in dev and 1 per AZ in prod, VPC endpoints (ECR, S3, Secrets Manager, CloudWatch Logs, STS), flow logs to CloudWatch | M | ☑ |
| BZ-073 | Data stack | Aurora MySQL Serverless v2 (encrypted, Multi-AZ in prod, secret rotation), MSK provisioned (TLS + SASL/SCRAM), ElastiCache Valkey (TLS + AUTH), MongoDB Atlas project/cluster/PrivateLink with the official constructs, S3 images + backups buckets, KMS keys, security groups that only admit the EKS nodes | L | ☑ |
| BZ-074 | Cluster stack | EKS on Graviton managed nodes, add-ons (AWS Load Balancer Controller, EBS CSI, metrics-server, External Secrets) via Helm with pinned versions, Pod Identity roles per app (S3 images for catalog, SES for notification), namespaces | L | ☑ |
| BZ-075 | Edge + observability stacks | S3 + CloudFront (OAC) for SSG/static and the admin SPA, SSR to the ALB origin, WAF managed rules, ACM/Route 53 when a domain is given; CloudWatch dashboard and alarms (5xx, p95, MSK lag, Aurora CPU) → SNS email | M | ☑ |
| BZ-077 | AWS readiness in the apps | What managed services need from the code, each switchable by env with today's local behaviour as default: Kafka TLS + SASL/SCRAM (MSK), `rediss://` (ElastiCache TLS), `mongodb+srv://` (Atlas), S3 through the default credential chain (Pod Identity) with virtual-hosted URLs and a CDN base URL for images, SES (API, Pod Identity) as an email transport next to SMTP, web image host/path from build args | M | ☑ |
| BZ-076 | AWS overlay + deploy pipeline | `infra/k8s/overlays/aws`: ALB Ingress, ExternalSecrets from Secrets Manager, service accounts, 2+ replicas with PDB `minAvailable: 1`, managed endpoints; `deploy.yml` written in full (OIDC → ECR → cdk deploy → migration Job → kubectl apply → S3 sync + invalidation), manual and disabled; `docs/aws-cost.md` monthly estimate; ADR | M | ☑ |

## P9 — Observability + quality
Goal: on staging (kind) every request can be followed from metric to trace to log in Grafana, the NFR numbers are measured with k6 and written in the README, and the resilience drills are run and written up (plan §0.3, §9.3, NFR-01..08).

| Id | Ticket | Acceptance criteria | Size | Status |
|---|---|---|---|---|
| BZ-078 | Metrics | `/metrics` on every service (prom-client in nest-common): HTTP RED per route, Kafka produced/consumed/failed, outbox backlog and oldest age, saga state counts; never behind the public ingress; unit-tested | M | ☐ |
| BZ-079 | Traces + log correlation | OpenTelemetry SDK in nest-common (HTTP, Prisma, Redis auto-instrumentation; trace context in Kafka headers across producer → consumer; manual spans for saga steps); `traceId` in every pino line; OTLP exporter configured by env, off by default | M | ☐ |
| BZ-080 | Observability stack on kind | Helm (pinned): kube-prometheus-stack, Loki + Alloy, Tempo, OTel Collector in `observability`; ServiceMonitors for the apps, Strimzi Kafka exporter; Grafana at `grafana.bazaar.localhost` with datasources linked (metric → exemplar trace → logs) | L | ☐ |
| BZ-081 | Dashboards + alerts as code | Grafana dashboards (JSON in repo): golden signals per service, Kafka lag/DLQ, order funnel; `PrometheusRule` SLO alerts (gateway availability, p95 latency, consumer lag, DLQ not empty, outbox age, crash loops) → Alertmanager → Mailpit, each linking `docs/runbook.md` | M | ☐ |
| BZ-082 | Load tests | k6 scripts (`loadtest/`): browse + product page + API reads at 200 rps, checkout mix; `make load-test` against kind; NFR-02/03 results with hardware noted in the README | M | ☐ |
| BZ-083 | Resilience drills | R1–R6 of plan §0.3 run on kind and written up in `docs/drills.md` (what was done, what was seen, follow-ups); R7/R8 written as procedures | M | ☐ |

## P10 — Docs & polish
Detailed tickets are written at the start of the phase (plan §13).
