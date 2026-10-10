# Bazaar — Multi-vendor Marketplace — Project Plan

> A production-style fullstack showcase: **React with three rendering modes (SSG · SSR · SPA)**, **NestJS microservices talking over Kafka**, **MySQL + MongoDB** each used where it fits, shipped with **Docker** and run on **Kubernetes** (local `kind` cluster).
>
> Frontend (two independent projects): **Next.js 16 (React 19, App Router)** for the **customer site** — landing pages statically generated, catalog server-rendered — plus a **React SPA (Vite)** for the **admin site** (sellers + platform admins).
> Backend: **NestJS 12** + **Prisma** (MySQL and MongoDB) — one API gateway (BFF) and three domain services, events on **Apache Kafka (KRaft)**, transactional outbox for reliable publishing.
> Data: **MySQL 8.4** (users, orders, payments — money and strong consistency) · **MongoDB 8** (product catalog, reviews, notifications — flexible documents, text search).
> Platform: **Docker** (multi-stage images, compose for daily dev) · **Kubernetes** (Kustomize base + overlays, `kind` locally) · **GitHub Actions** CI/CD.
> Cloud: **AWS**, infrastructure as code with **AWS CDK (TypeScript)** — EKS, Aurora MySQL, MongoDB Atlas (on AWS, PrivateLink), MSK, S3 + CloudFront, ECR, Secrets Manager, CloudWatch.
> Diagrams: **draw.io** (architecture, k8s deployment, AWS deployment, ERD, event map, order state, one sequence per business flow).
>
> Mode: **real-project process, run 100 % locally.** Every environment a real team has (dev → CI → staging → prod) exists here: dev and staging run on the laptop (compose, kind), prod exists as reviewed, tested AWS CDK code that is never deployed. No cloud account, no cloud cost.
>
> Repo: https://github.com/deputychinh/Bazaar
>
> Status: **DECISIONS ANSWERED 2026-10-11** (§17) — waiting for the go to start P0.

---

## 0. How this mirrors a real project

### 0.1 Project lifecycle (what a real team does, and the file that proves it here)
| Stage | Real project | Here |
|---|---|---|
| 1. Discovery | Client brief, goals, constraints | `requirement.md` |
| 2. Requirements | FR / NFR, priorities (MoSCoW), out-of-scope list | §2, §2A |
| 3. Solution design | Architecture, data model, API, event contracts, ADRs, diagrams | §3–§9A, `docs/adr/`, `docs/architecture/` |
| 4. Planning | Backlog of epics → tickets with acceptance criteria, estimates, milestones | §13 + `docs/backlog.md` (ticket ids `BZ-001…`) |
| 5. Sign-off | Client/lead approves the plan before build | This document, Status line above |
| 6. Build in iterations | One phase = one milestone; PR per ticket, review, CI green | §0.3, §11, §13 |
| 7. Release | Versioned release, changelog, promotion dev → staging → prod | §0.2, `CHANGELOG.md`, git tags `v0.N.0` per phase |
| 8. Operate | Monitoring, alerts, runbook, incidents, postmortems | §9.3, `docs/runbook.md`, §0.4 drills, `docs/postmortems/` |

### 0.2 Environments — all local
| Real environment | Here | How it runs | What it is for |
|---|---|---|---|
| **dev** | Laptop | `make up` (infra in compose) + `make dev` (apps with hot reload) | Daily coding, fast feedback |
| **CI** | GitHub Actions, or `make ci` locally (same steps) | lint → typecheck → unit → integration (Testcontainers) → build | Every PR must pass |
| **staging** | **kind cluster** `bazaar-staging` | Images built once (tag = git sha), loaded into kind, `kubectl apply -k overlays/local`, migration Job first, Traefik ingress at `http://bazaar.localhost` | Behaves like prod: k8s, rolling updates, probes, HPA, Strimzi Kafka |
| **prod** | **AWS CDK code** (§9A) | `cdk synth` + Jest assertions + cdk-nag + `cdk diff`; never `cdk deploy` | Shows exactly how prod would be built and reviewed |

Rules taken from real teams: **build once, promote the same image**; config only from env (12-factor); secrets never committed (`.env` git-ignored, `.env.example` documented); DB migrations forward-only, run before the new version, expand → contract for breaking changes.

> Why no EC2 / no live AWS: running locally gives the same learning (the cluster, the rollout, the failures) at zero cost. EKS worker nodes *are* EC2 instances anyway; a cheap EC2 + k3s "demo" host can be added later without changing the app (next step).

### 0.3 Ways of working
- **Backlog:** `docs/backlog.md` — epics per phase, tickets `BZ-xxx` with user story, acceptance criteria, estimate (S/M/L). Optional mirror to GitHub Issues + Project board.
- **Definition of Ready:** acceptance criteria written, contracts (DTO / event) agreed in `backend/packages/contracts` and the OpenAPI file, dependencies known.
- **Definition of Done:** code + tests (unit, plus integration when DB/Kafka is touched), lint/typecheck green, docs/ADR updated, works in staging (kind).
- **Git (decided 2026-10-11):** trunk-based, work committed straight to `main` — one **Conventional Commit** per finished ticket (`feat(order): add seller order split [BZ-041]`), pushed after lint + tests pass locally. No PR step; `main` must always build.
- **Quality gates before commit:** Husky + lint-staged (ESLint, Prettier, Stylelint on staged files), commitlint.
- **Security hygiene:** `npm audit` + Trivy image scan in CI, Renovate for dependency updates, no secrets in images.
- **Release:** at the end of each phase → tag `v0.N.0`, `CHANGELOG.md` entry, demo of the milestone (screenshots in `docs/screenshots/`).

### 0.4 Operations drills (to really understand the system)
Run on staging (kind), each written up in `docs/drills.md` with what happened and what was seen in k9s / Kafka UI / Grafana:
| # | Drill | What you learn |
|---|---|---|
| R1 | Kill the order-service pod mid-checkout | Kafka consumer rebalance, outbox resends, idempotent consumer — no lost or double order |
| R2 | Stop the Kafka broker for 2 minutes | Outbox backlog grows, orders stay PENDING, everything catches up after restart |
| R3 | 50 concurrent buyers for the last 5 items | Atomic stock decrement — exactly 5 orders confirmed |
| R4 | Poison message on `order.events` | Retry topic → DLQ → replay from runbook |
| R5 | Rolling update with a broken image | Readiness probe blocks the rollout; `kubectl rollout undo` |
| R6 | Load test past HPA threshold | gateway scales out, latency in Grafana |
| R7 | Run a breaking migration the expand/contract way | Zero-downtime schema change |
| R8 | Restore MySQL + Mongo from backup into a fresh cluster | Backups actually work |

---

## 1. Goals

| What the requirement asks for | How this project shows it |
|---|---|
| React **static** landing page | Next.js routes built with SSG at build time (`/`, `/pricing`, `/about`, `/sell`) — served as plain HTML, cache forever on CDN |
| React **SSR** | Catalog, category and product pages rendered per request (fresh price/stock, full SEO, Open Graph), with ISR for hot pages |
| React **single page app** | Admin site (sellers + platform admins): React + Vite + React Router, client-only, behind login, dense tables and live order updates |
| Rendering chosen **by page state** | One written rule (§6.1) and a route table that states the mode of every page |
| NestJS | Gateway + 3 services, same layered module layout, shared config / logging / health / Kafka modules |
| Kafka | Domain events between services (order saga by choreography), outbox → Kafka, consumer groups, retry + dead-letter topics, Kafka UI to watch traffic |
| MongoDB **and** MySQL | Written reason per entity (§7.1). One ORM for both: **Prisma** — MySQL with `prisma migrate`, MongoDB with `prisma db push` + index scripts |
| Docker | One multi-stage Dockerfile per app, non-root, small images; `docker compose` brings up all infra in one command |
| Kubernetes | Kustomize manifests (Deployments, Services, StatefulSets, ConfigMaps, Secrets, HPA, probes, ingress), `kind` cluster script, `k9s` for watching |
| AWS with CDK | Whole cloud environment in CDK TypeScript (§9A): VPC, EKS, Aurora MySQL, MongoDB Atlas, MSK, S3 + CloudFront, ECR, GitHub OIDC, alarms; unit-tested and checked with cdk-nag |
| Production quality | Tests (unit, integration with Testcontainers, e2e Playwright), CI, ADRs, diagrams, runbook, metrics & tracing |

**Main aim: simple, explicit code.** No magic strings: one home for each enum, constant, event name and interface (`backend/packages/contracts`, exposed to the frontends through the gateway OpenAPI). Small modules, readable names. When two options work, the simpler one wins.

---

## 2. Product scope (MVP)

**Bazaar** is a small multi-vendor marketplace. Sellers open a shop and list products; shoppers browse, search and buy; the platform admin moderates.
This domain is picked because it naturally needs all three rendering modes, both kinds of database and real asynchronous events.

### Personas
- **Visitor / Shopper:** reads landing pages, browses the catalog, searches, buys, tracks orders, reviews.
- **Seller:** manages shop, products and stock, handles incoming orders (admin site, SPA).
- **Admin:** approves sellers, hides products, sees platform numbers (same SPA, admin area).

### Features: in scope
| # | Feature | Rendering / service |
|---|---|---|
| F1 | Landing, pricing, about, "sell on Bazaar" pages | SSG |
| F2 | Catalog: categories, product list with filters, full-text search | SSR · catalog-service (Mongo) |
| F3 | Product detail with reviews, stock, seller info, SEO meta + JSON-LD | SSR + ISR · catalog-service |
| F4 | Auth: sign up with email verification, sign in, refresh, forgot / reset password, roles (shopper, seller, admin); shopper applies to become a seller → admin approves | gateway (MySQL), RS256 JWT access + httpOnly refresh cookie |
| F5 | Cart (client state) and checkout | SSR shell + client components · order-service |
| F6 | Order saga: create → reserve stock → pay (fake provider) → confirm / cancel; one checkout = one `Order`, split into one `SellerOrder` per seller | order-service (MySQL) ⇄ Kafka ⇄ catalog-service |
| F6b | Fulfilment per seller: seller marks their `SellerOrder` shipped → delivered; shopper can cancel a seller order before it ships | admin site (seller) · order-service |
| F7 | Shopper "My orders" with live status | client components, SSE from gateway |
| F8 | Admin site — seller area: products CRUD, stock, images, orders queue, dashboard | SPA |
| F9 | Admin site — platform area: approve sellers, moderate products, platform stats | SPA |
| F10 | Notifications: email (Mailpit locally) + in-app list on order events | notification-service (Mongo), Kafka consumer |
| F11 | Reviews after delivery, rating summary on product | catalog-service, event-driven rating update |
| F12 | Event log viewer for admin | notification-service stores every event |
| F13 | **Bilingual EN / VI**: both sites, emails and product content; locale in the URL (`/en`, `/vi`) on the customer site | next-intl (web), react-i18next (admin), localized fields in Mongo |
| F14 | **Display in USD or VND**: all money is stored and charged in **USD cents**; the shopper can view prices in VND (default for `vi`). Rates come from an external FX service, never from our databases | gateway `currency` module (FX provider adapter + Redis cache), both sites |

### Out of scope (written as "next steps")
Real payment provider and refunds, live FX rates, currencies beyond USD/VND, languages beyond EN/VI, shipping carriers and fees, taxes, recommendations, mobile app, multi-region.

---

## 2A. Requirements → design standards → decisions

### 2A.1 Functional requirements (FR)
| ID | Requirement | Actor | Priority |
|---|---|---|---|
| FR-01 | Public marketing pages load as static HTML | Visitor | Must |
| FR-02 | Catalog and product pages are indexable by search engines and show current price/stock | Visitor | Must |
| FR-03 | Sign up (with email verification) / in / out, forgot + reset password; roles shopper, seller, admin | All | Must |
| FR-04 | Search products by text, filter by category, price, rating; sort; paginate | Shopper | Must |
| FR-05 | Place an order from the cart; stock is never oversold | Shopper | Must |
| FR-06 | Order status moves PENDING → RESERVED → PAID → CONFIRMED (or CANCELLED with reason); each seller order then moves CONFIRMED → SHIPPED → DELIVERED (or CANCELLED before shipping); the shopper sees every change live | Shopper | Must |
| FR-07 | Seller manages products and stock; sees and fulfils their orders | Seller | Must |
| FR-08 | Shopper and seller get a notification on every order state change | System | Should |
| FR-09 | Admin approves sellers and hides products | Admin | Should |
| FR-10 | Reviews after delivery; product rating updates automatically | Shopper | Should |
| FR-11 | Dashboards: seller sales per day, admin GMV / orders / top sellers | Seller, Admin | Could |
| FR-12 | Every screen, email and error message available in English and Vietnamese; products have EN + VI title/description | All | Must |
| FR-13 | All amounts stored and charged in USD cents; prices can be displayed in VND using a rate from an external FX service | Shopper | Must |

### 2A.2 Non-functional requirements (NFR)
| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Landing LCP | < 1.5 s on 4G (static + CDN) |
| NFR-02 | Product page TTFB (SSR) | p95 < 300 ms with warm cache |
| NFR-03 | Public API latency | p95 < 200 ms for reads at 200 rps (k6) |
| NFR-04 | No lost events | Outbox + idempotent consumers; at-least-once delivery, effectively-once effects |
| NFR-05 | No overselling | Atomic conditional stock decrement; tested with concurrent orders |
| NFR-06 | Services restart safely | Readiness / liveness probes, graceful shutdown drains Kafka consumers |
| NFR-07 | Security | OWASP basics: hashed passwords (argon2), rate limits, CORS allow-list, Helmet, no secrets in images |
| NFR-08 | Observability | Structured JSON logs with trace id, Prometheus metrics, OpenTelemetry traces across HTTP + Kafka |
| NFR-09 | Accessibility | WCAG 2.2 AA on public pages |
| NFR-10 | Code quality | Strict TypeScript, ESLint 0 warnings, ≥ 80 % unit coverage on domain logic |

### 2A.3 Design standards (DS)
| ID | Standard |
|---|---|
| DS-01 | Every enum, constant, event name, topic name and shared DTO lives in `backend/packages/contracts` and is imported — never re-typed. Frontends never hand-write API types; they generate them from the gateway OpenAPI |
| DS-02 | Each service owns its database; no service reads another service's tables/collections |
| DS-03 | Sync calls only gateway → service (HTTP); service ↔ service is **async** via Kafka |
| DS-04 | A state change and its event are committed together (outbox table in MySQL, outbox collection in a Mongo transaction) |
| DS-05 | Every consumer is idempotent (processed-event table/collection keyed by `eventId`) |
| DS-06 | Rendering mode is decided by the rule in §6.1 and written in the route table |
| DS-07 | All CSS is BEM, values only from design tokens (`src/styles/tokens.css` in each frontend, both matching `docs/design-system.md`), enforced by Stylelint |
| DS-08 | Same NestJS module layout in every service (§6A.3): `controller → service → repository (abstract port → Prisma adapter)`; domain classes have no framework imports |
| DS-09 | Config only from env, validated at boot (zod); fail fast |
| DS-10 | Utils have plain names (`formatMoney`, `toSlug`, `sleep`) and live in one `utils` folder per package |
| DS-11 | Coding conventions and patterns in §6A apply to every project: single-source enums/constants/interfaces, backend classes + SOLID, frontend arrow functions + tokens + BEM — enforced by lint where possible |

---

### 2B. Business rules (agreed 2026-10-11)
| Area | Rule |
|---|---|
| Orders across sellers | One checkout = one `Order` (one payment). It is split into one `SellerOrder` per seller; each seller only sees and fulfils their own `SellerOrder` |
| Order states | `Order`: PENDING → RESERVED → PAID → CONFIRMED, or CANCELLED (reasons: OUT_OF_STOCK, PAYMENT_FAILED, RESERVATION_TIMEOUT, SHOPPER_CANCELLED). `SellerOrder`: CONFIRMED → SHIPPED → DELIVERED, or CANCELLED before SHIPPED (stock released). When every seller order is final, the `Order` is COMPLETED |
| Reviews | Only for items of a DELIVERED seller order, one review per item per shopper |
| Payment (fake provider) | Card `4000 0000 0000 0002` → declined, `4000 0000 0000 0119` → timeout, any other valid test number → success. No real refunds (cancellation after payment marks a "refund pending" record) |
| Currency (decided 2026-10-11) | **Databases store one denomination only: USD cents** (integers) — prices, order totals, payments, dashboards. No currency or rate columns anywhere. Conversion and display go through other services: the gateway `currency` module calls an external FX provider behind an `FxRateProvider` port (Strategy: `HttpFxRateProvider` for a real API, `StaticFxRateProvider` with a fixed rate from config for offline dev/tests), caches rates in Redis (TTL 1 h) and serves `GET /api/v1/fx-rates`. Frontends format with `Intl.NumberFormat` (VND rounded to whole đồng). Payments are always charged in USD; VND figures in UI and emails are labelled approximate |
| Language | EN and VI everywhere. Backend returns error **codes**, frontends translate them. Emails use the user's `preferredLocale`. Product title/description stored as `{ en, vi }`; missing VI falls back to EN |
| Time | Stored UTC; shown in the browser's time zone, formatted per locale |
| Auth | Gateway signs RS256 JWT (15 min access, 7-day rotating refresh in httpOnly cookie). Downstream services verify the JWT themselves with the public key (zero-trust inside the cluster). Email verification and password reset links expire after 24 h / 1 h |
| Shipping & tax | Free shipping, no tax in the MVP |
| Images | Uploaded straight to object storage (MinIO locally, S3 in prod) with presigned URLs; max 5 MB, JPEG/PNG/WebP |
| Live status at scale | Each gateway pod reads `order.events` with its own consumer group and pushes SSE only to its connected shoppers |
| Event evolution | `version` in the envelope; only additive changes inside a version; breaking change = new `v2` event published alongside until consumers move |

---

## 3. Architecture

```
                         ┌───────────────── Browser ─────────────────┐
                         │  SSG pages   SSR pages   SPA admin        │
                         └──────┬────────────┬────────────┬──────────┘
                                │            │            │
                      ┌─────────▼────────────▼──┐   ┌─────▼───────────┐
                      │  frontend-web (Next.js) │   │ frontend-admin  │
                      │  SSG + SSR + ISR        │   │ (Vite SPA,nginx)│
                      └─────────┬───────────────┘   └─────┬───────────┘
                                │  REST (server-side)     │ REST + SSE
                         ┌──────▼─────────────────────────▼──────┐
                         │   services/gateway  (NestJS BFF)      │──── MySQL: users, tokens
                         │   auth · rate limit · aggregation     │
                         └──┬──────────────┬──────────────┬──────┘
                            │ HTTP         │ HTTP         │ HTTP
                  ┌─────────▼───┐   ┌──────▼──────┐  ┌────▼──────────────┐
                  │ catalog-svc │   │ order-svc   │  │ notification-svc  │
                  │ MongoDB     │   │ MySQL       │  │ MongoDB · SMTP    │
                  └─────┬───────┘   └──────┬──────┘  └────┬──────────────┘
                        │   produce/consume│              │ consume
                  ══════▼══════════════════▼══════════════▼══════════
                                Apache Kafka (KRaft)
                  ═══════════════════════════════════════════════════
```

### 3.1 Components
| Component | Tech | Responsibility | Data |
|---|---|---|---|
| `frontend-web` | Next.js 16, React 19 | Public site: SSG marketing, SSR catalog, checkout, my orders | — |
| `frontend-admin` | Vite, React 19, React Router, TanStack Query | Seller & admin SPA | — |
| `backend/services/gateway` | NestJS, Prisma (MySQL) | Auth, JWT, roles, rate limit, routes requests to services, SSE for live order status (fed from Kafka) | MySQL `bazaar_identity` |
| `backend/services/catalog` | NestJS, Prisma (MongoDB) | Shops, products, categories, stock, reviews, search | MongoDB `bazaar_catalog` |
| `backend/services/order` | NestJS, Prisma (MySQL) | Orders, payments (fake provider), saga state, outbox | MySQL `bazaar_order` |
| `backend/services/notification` | NestJS, Prisma (MongoDB), Nodemailer | Consumes events, emails, in-app notifications, event log | MongoDB `bazaar_notification` |
| Kafka | apache/kafka (KRaft, no ZooKeeper) | Event backbone | — |
| Kafka UI | kafbat/kafka-ui | Watch topics, messages, consumer lag | — |
| Mailpit | axllent/mailpit | Catch emails locally | — |
| **Redis** | redis (8.x) | Gateway rate limits shared across pods, catalog read cache (product / category pages), distributed locks for scheduled jobs (reservation timeout, outbox relay leader), idempotency keys for `POST /orders` | — |
| MinIO | minio/minio | S3-compatible object storage for product images and backups | — |

### 3.2 Why gateway + 3 services (and not more)
Enough to show real boundaries (two databases, async saga, fan-out consumer) without micro-service sprawl. Identity stays inside the gateway to save a hop; splitting it out later is a listed next step.

---

## 4. Repository layout — one repo, three independent projects

One git repo (`deputychinh/Bazaar`), but **three projects that share nothing at build time** (decided 2026-10-11):

| Project | Folder | Own package.json + lockfile | Talks to the others through |
|---|---|---|---|
| Backend (NestJS services + shared backend packages) | `backend/` | yes — npm workspaces + Turborepo **inside `backend/` only** | Kafka (between services), REST/OpenAPI (to frontends) |
| Customer site (Next.js) | `frontend-web/` | yes | Gateway REST API; types generated from `backend/openapi/gateway.json` |
| Admin site (React SPA) | `frontend-admin/` | yes | Gateway REST API; types generated from `backend/openapi/gateway.json` |

Each project can be installed, built, tested, containerised and released on its own (own CI workflow with a path filter), exactly as if it lived in its own repo — splitting into three repos later is a `git subtree split`.

```
bazaar/
├── backend/
│   ├── package.json         # npm workspaces: services/*, packages/*
│   ├── turbo.json
│   ├── services/
│   │   ├── gateway/         # NestJS BFF + identity (MySQL)
│   │   ├── catalog/         # NestJS (MongoDB)
│   │   ├── order/           # NestJS (MySQL, outbox)
│   │   └── notification/    # NestJS (MongoDB)
│   ├── packages/
│   │   ├── contracts/       # backend single source: enums, constants, topics, events, zod schemas (DS-01)
│   │   └── nest-common/     # config, logger, health, Kafka wrapper, outbox relay, idempotency
│   └── openapi/
│       └── gateway.json     # exported OpenAPI of the gateway — the contract for both frontends (committed)
├── frontend-web/            # Next.js — customer site (SSG + SSR + ISR)
│   ├── src/api/schema.ts    # generated by openapi-typescript (never edited by hand)
│   └── src/styles/tokens.css
├── frontend-admin/          # React SPA (Vite) — admin site: seller + platform admin
│   ├── src/api/schema.ts    # generated by openapi-typescript
│   └── src/styles/tokens.css
├── infra/
│   ├── docker/              # init scripts (mysql users, kafka topics, mongo replica set + indexes)
│   ├── k8s/
│   │   ├── kind/            # kind-config.yaml (1 control-plane + 2 workers, port mappings)
│   │   ├── base/            # one folder per app + data stores (Kustomize)
│   │   └── overlays/
│   │       ├── local/       # kind: in-cluster MySQL/Mongo/Kafka, 1 replica
│   │       └── aws/         # EKS: managed Aurora / MongoDB Atlas / MSK endpoints, ALB ingress, HPA, PDB
│   └── cdk/                 # AWS CDK app (TypeScript, own package.json) — see §9A
│       ├── bin/bazaar.ts    # entry: builds stacks per environment (dev, prod)
│       ├── lib/stacks/      # network, data, cluster, edge, ci, observability
│       ├── lib/config/      # env settings (account, region, sizes) — one place, typed
│       └── test/            # Jest assertions + snapshot + cdk-nag
├── e2e/                     # Playwright journeys (own package.json)
├── loadtest/                # k6 scripts
├── docs/
│   ├── plan.md
│   ├── design-system.md     # brand palette + BEM rules — source of truth for both tokens.css files
│   ├── adr/
│   ├── architecture/        # *.drawio + exported *.png + README
│   └── runbook.md
├── scripts/                 # check-tokens.mjs, check-openapi.mjs (cross-project consistency checks)
├── .github/workflows/       # backend.yml, web.yml, admin.yml, cdk.yml, k8s-smoke.yml, deploy.yml
├── package.json             # repo tooling only: husky, lint-staged, commitlint, prettier — no workspaces
├── docker-compose.yml
├── Makefile                 # one command per task, `make help`
├── .env.example
└── requirement.md
```

### 4.1 How "write it once" still holds without shared packages
| Shared thing | Single source | How each frontend gets it | Drift check |
|---|---|---|---|
| Enums, DTOs, error codes | `backend/packages/contracts` → gateway DTOs → `backend/openapi/gateway.json` (enums exported as OpenAPI enums) | `npm run gen:api` (openapi-typescript) → `src/api/schema.ts` | CI fails if `gateway.json` is stale vs the gateway code, or if a frontend's `schema.ts` is stale vs `gateway.json` (`scripts/check-openapi.mjs`) |
| Brand palette / tokens | `docs/design-system.md` | Each frontend has its own `src/styles/tokens.css` | CI compares the token block of both files (`scripts/check-tokens.mjs`) |
| Events, topics | `backend/packages/contracts` | Not needed by frontends | — |

---

## 5. Backend design (NestJS)

### 5.1 Module layout (same in every service — DS-08)
Every service uses the class-based folder structure, SOLID rules and patterns defined in **§6A.3** (`modules/<feature>/{controllers,services,repositories,domain,dto,mappers,events,errors}` plus service-level `config/`, `constants/`, `enums/`, `interfaces/`, `utils/`, `common/`). `main.ts` handles bootstrap: config validation, Helmet, global zod pipe, problem-details filter, graceful shutdown.

### 5.2 Kafka
- Client: **`@confluentinc/kafka-javascript`** (actively maintained, librdkafka-based, KafkaJS-compatible API). KafkaJS — and therefore the built-in `@nestjs/microservices` Kafka transport — is no longer maintained (last release 2023), so it is not used. Producer and consumer are wrapped in `nest-common` (`EventProducer`, `EventConsumer`), started inside each Nest app's lifecycle hooks; swapping the library touches one folder.
- **Topics** (names only in `contracts/topics.ts`), 3 partitions locally, key = aggregate id (keeps order per order/product):

| Topic | Producer | Consumers | Events |
|---|---|---|---|
| `order.events` | order | catalog, notification, gateway | `OrderCreated`, `OrderPaid`, `OrderConfirmed`, `OrderCancelled`, `OrderCompleted`, `SellerOrderShipped`, `SellerOrderDelivered`, `SellerOrderCancelled` |
| `inventory.events` | catalog | order, notification | `StockReserved`, `StockRejected`, `StockReleased` |
| `catalog.events` | catalog | notification, web revalidate hook | `ProductPublished`, `ProductUpdated`, `ProductHidden`, `RatingUpdated` |
| `identity.events` | gateway | notification | `UserRegistered`, `SellerApproved` |
| `<topic>.retry` / `<topic>.dlq` | nest-common | ops | failed messages after N retries |

- **Envelope** (one interface in contracts): `{ eventId, type, version, occurredAt, aggregateId, traceId, payload }`.
- **Outbox**: order-service writes `orders` row + `outbox` row in one MySQL transaction; a relay (in nest-common) polls `outbox` → publishes → marks sent. Catalog does the same with an `outbox` collection inside a Mongo transaction (replica set).
- **Idempotency**: each consumer stores `eventId` in `processed_events` in the same transaction as the effect.

### 5.3 Order saga (choreography)
```
Shopper ─POST /orders (Idempotency-Key)→ gateway → order-svc:
        Order(PENDING) + SellerOrders(one per seller) + OrderCreated            [one MySQL tx + outbox]
OrderCreated  → catalog-svc: atomic decrement where stock ≥ qty for every line
                 ├ ok   → StockReserved  → order-svc: RESERVED → fake payment
                 │                         ├ ok   → PAID → CONFIRMED + OrderConfirmed (seller orders → CONFIRMED)
                 │                         └ fail → CANCELLED(PAYMENT_FAILED) + OrderCancelled → catalog releases stock
                 └ fail → StockRejected  → order-svc: CANCELLED(OUT_OF_STOCK)
Seller: SellerOrder CONFIRMED → SHIPPED (SellerOrderShipped) → DELIVERED (SellerOrderDelivered → reviews unlocked)
Shopper cancels a seller order before SHIPPED → SellerOrderCancelled → catalog releases that seller's stock
All seller orders final → Order COMPLETED (OrderCompleted)
Every event → notification-svc (email + in-app, in the user's locale) and gateway (SSE push to the shopper)
Reservation timeout (15 min, scheduled job in order-svc, single runner via Redis lock) → CANCELLED(RESERVATION_TIMEOUT) + release
```

### 5.4 API (gateway, REST, OpenAPI at `/api/docs`)
`/api/v1/auth/*` · `/products` · `/categories` · `/search` · `/shops/:slug` · `/orders` · `/orders/:id/stream` (SSE) · `/seller/*` · `/admin/*` · `/notifications`
Errors: one problem-details shape (`{ code, message, details }`), codes in `contracts/errors.ts`.

---

## 6. Frontend design

### 6.1 Rendering rule (DS-06)
| Page state | Mode | Why |
|---|---|---|
| Public, same for everyone, changes only on deploy | **SSG** | Fastest, cheapest, CDN-cacheable |
| Public, SEO matters, data changes often | **SSR** (+ **ISR** with on-demand revalidate when a product changes) | Fresh price/stock and full meta tags for crawlers |
| Private, per-user, highly interactive | **SPA** (client-only) | No SEO need; rich state, fast navigation after first load |
| Private but simple, inside the public site (cart, my orders) | SSR shell + client components | Keeps one site and one session for shoppers |

### 6.2 Route table
All customer-site routes are prefixed with the locale: `/en/...`, `/vi/...` (`/` redirects by `Accept-Language`, `hreflang` alternates on every page). Admin site keeps the locale in user settings.

| Route | App | Mode |
|---|---|---|
| `/`, `/pricing`, `/about`, `/sell`, `/legal/*` | web | SSG |
| `/c/[category]`, `/search` | web | SSR |
| `/p/[slug]`, `/shop/[slug]` | web | SSR + ISR (revalidated by `catalog.events`) |
| `/cart`, `/checkout` | web | SSR shell + client |
| `/account/orders`, `/account/orders/[id]` | web | client, live via SSE |
| `/login`, `/register` | web | SSG page + client form |
| `admin.*/seller/**` | admin | SPA |
| `admin.*/platform/**` | admin | SPA |
| `/verify-email`, `/reset-password` | web | SSG page + client form |

### 6.3 Shared frontend rules
- **Design tokens**: full colour, spacing/padding, typography, radius, shadow, z-index, breakpoint and motion lists in §6A.5 (source of truth `docs/design-system.md`, copied into each frontend's `src/styles/tokens/`, kept equal by `scripts/check-tokens.mjs`). Brand: "Saffron & Ink".
- **CSS**: plain CSS with BEM and layout primitives (§6A.6). No Tailwind, no CSS-in-JS.
- **Data**: each frontend generates `src/api/schema.ts` from `backend/openapi/gateway.json` (openapi-typescript) and calls the API through `openapi-fetch` (typed, tiny). web: server-side fetch in Server Components; admin: TanStack Query. Enums come from the generated schema.
- **Tests**: Vitest + React Testing Library; Playwright for journeys.

---

## 6A. Coding conventions & patterns

Rules every project follows. Enforced by lint where possible (§6A.8); the rest is checked in code review. P0 copies this section into `CONTRIBUTING.md`.

**Four principles:** (1) **single source** — every enum, constant and interface is declared in exactly one file of its kind and imported everywhere else; (2) **independent units** — each module/feature/component depends only on abstractions and its own folder, so it can be moved, tested or replaced alone; (3) **backend = classes + SOLID**; (4) **frontend = arrow functions + design tokens + BEM**.

### 6A.1 Single-source declarations (all projects)
| Kind | Only allowed in | File name | Example |
|---|---|---|---|
| Enum | `enums/` | `<name>.enum.ts` — **one enum per file** | `enums/order-status.enum.ts` → `export enum OrderStatus { Pending = 'PENDING', Paid = 'PAID' }` |
| Constant (module-level `UPPER_SNAKE_CASE`) | `constants/` | `<topic>.constant.ts` | `constants/order.constant.ts` → `export const RESERVATION_TIMEOUT_MINUTES = 15;` |
| Interface / type alias shared by 2+ files | `interfaces/` | `<name>.interface.ts` | `interfaces/page.interface.ts` → `export interface Page<T> { items: T[]; nextCursor: string \| null }` |
| Util | `utils/` | `<name>.util.ts` | BE: `utils/money.util.ts` → `class MoneyUtil`; FE: `utils/money.util.ts` → `export const formatMoney = …` |

- Enums are **string enums** (`Pending = 'PENDING'`), never numeric.
- Shared backend enums/constants/interfaces live in `backend/packages/contracts/src/{enums,constants,interfaces}`; a service keeps its own folders for things only it uses. Nothing is re-declared.
- Frontends get API enums/types from the generated `src/api/schema.ts` (openapi-typescript with `--enum`, so API enums arrive as real TS enums). Frontend-only enums/constants/interfaces go in the frontend's own `enums/`, `constants/`, `interfaces/`.
- The only interface allowed outside `interfaces/` is a component's own `XxxProps` (frontend) or a class's own constructor options, declared in the same file.
- Each folder has an `index.ts` that re-exports its files (the only barrels allowed), so imports read `import { OrderStatus } from '@bazaar/contracts'` / `'@/enums'`.

### 6A.2 Shared conventions (all projects)
| Topic | Convention |
|---|---|
| TypeScript | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. No `any` (use `unknown` and narrow). No non-null `!` outside tests. No `@ts-ignore` (`@ts-expect-error` + reason only). Exported members have explicit types |
| Naming — identifiers | `camelCase` variables/functions/methods · `PascalCase` classes, enums, interfaces, components · `UPPER_SNAKE_CASE` constants · enum members `PascalCase` · booleans `is/has/can/should…` · functions/methods start with a verb (`getOrder`, `reserveStock`) · no abbreviations except `id`, `url`, `dto`, `api` · no `I` prefix on interfaces |
| Naming — files | `kebab-case` + role suffix everywhere (`orders.controller.ts`, `order-state-machine.ts`, `money.util.ts`), except React components `PascalCase.tsx` with their `PascalCase.css`, and hooks `useCart.ts` |
| Imports | node builtins → packages → `@/` alias → relative (auto-sorted). No `../../..`. No import cycles. A feature never imports another feature's internals — only its public `index.ts` |
| Size | Functions/methods aim < 30 lines, classes < 200 lines, components < 150 lines, files < 300 lines. Early returns, no nested ternaries, max 3 parameters (else one options object) |
| Errors | Never swallow. Throw typed errors carrying an `ErrorCode` enum; translate to HTTP / UI **once**, at the edge. No `throw 'string'` |
| Async | `async/await` only (no `.then` chains). No floating promises. `Promise.all` for independent work. Every external call has a timeout |
| Data formats | Money = integer cents + `Currency` enum · dates UTC ISO-8601, formatted only in the UI · ids UUID v7 (MySQL) / ObjectId (Mongo), strings in APIs · JSON `camelCase` |
| Config | `process.env` / `import.meta.env` read only in the config module, validated with zod at start-up |
| Comments | Explain *why*, not *what*. `TODO(BZ-123): …` must carry a ticket id. Public classes/functions of shared packages get TSDoc |
| Formatting | Prettier (print width 100, single quotes, trailing commas, semicolons). ESLint 0 warnings |
| Logging | Structured only (`this.logger.info({ orderId }, 'order confirmed')`). No `console.*`. Never log secrets, tokens, passwords or personal data |
| Tests | Unit tests next to the code (`*.spec.ts` / `*.test.tsx`), integration in `test/integration/*.int-spec.ts`. Arrange–Act–Assert, one behaviour per test, names read as sentences (`'cancels the order when stock is rejected'`). Test data from factory builders, not shared fixtures |

### 6A.3 Backend — classes, SOLID and patterns
**Everything in backend `src/` is a class** (controllers, services, repositories, mappers, domain logic, event handlers, utils with static methods). The only plain functions allowed: `main.ts` bootstrap and Nest decorator factories (`Roles()`, `CurrentUser()`).

**Folder structure of every service**
```
src/
├── main.ts
├── app.module.ts
├── config/              app-config.ts (class AppConfig), env.schema.ts
├── constants/           *.constant.ts      (service-only constants)
├── enums/               *.enum.ts          (service-only enums)
├── interfaces/          *.interface.ts     (service-only shared interfaces)
├── utils/               *.util.ts          (classes with static methods)
├── common/              filters/, guards/, pipes/, interceptors/, decorators/, errors/ (DomainError base)
└── modules/
    └── orders/
        ├── orders.module.ts
        ├── controllers/   orders.controller.ts
        ├── services/      orders.service.ts
        ├── repositories/  orders.repository.ts (abstract class = port) · prisma-orders.repository.ts (adapter)
        ├── domain/        order-state-machine.ts · order-pricing.ts   (pure classes, no Nest/Prisma imports)
        ├── dto/           create-order.dto.ts (zod schema + inferred type)
        ├── mappers/       order.mapper.ts (class OrderMapper)
        ├── events/        order-events.handler.ts
        ├── errors/        order-not-found.error.ts
        └── index.ts       (public API of the module: module + service only)
```

**SOLID, applied concretely**
| Principle | How it shows in the code |
|---|---|
| **S** — single responsibility | One class, one reason to change: `OrdersController` (HTTP), `OrdersService` (use cases + transaction), `PrismaOrdersRepository` (persistence), `OrderMapper` (shape), `OrderStateMachine` (rules) |
| **O** — open/closed | New behaviour by adding a class, not editing one: `PaymentProvider` → `FakePaymentProvider` (later `StripePaymentProvider`); `NotificationChannel` → `EmailChannel`, `InAppChannel` picked by a `NotificationChannelRegistry` |
| **L** — Liskov substitution | Every implementation passes the same contract test suite as its abstract class (e.g. one `ordersRepositoryContract()` suite runs against `InMemoryOrdersRepository` and `PrismaOrdersRepository`) |
| **I** — interface segregation | Small ports per need: `OrderReader` / `OrderWriter`, `EventPublisher`, `Clock`, `IdGenerator` — a class depends only on the methods it calls |
| **D** — dependency inversion | Services depend on **abstract classes** used as DI tokens, never on Prisma or Kafka directly: `{ provide: OrdersRepository, useClass: PrismaOrdersRepository }`. Time and ids injected (`Clock`, `IdGenerator`) so domain code is deterministic in tests |

**Design patterns used (and where)**
| Pattern | Where |
|---|---|
| Repository (port + adapter) | Every persistence access |
| Strategy | Payment providers, notification channels |
| State machine | `OrderStateMachine.transition(current, event)` — illegal transitions throw `InvalidOrderTransitionError` |
| Template method | `BaseEventHandler<T>` (validate with zod → idempotency check → `protected abstract handle(payload)`), subclassed per event |
| Factory | `EventFactory.create(type, aggregateId, payload)` builds envelopes (id, time, traceId) |
| Mapper | `XxxMapper.toResponse()` / `toDomain()` — Prisma models never leave the repository |
| Transactional outbox | `OutboxWriter` used inside the service transaction; `OutboxRelay` publishes |
| Unit of work | `TransactionManager.run(async (tx) => …)` wraps `prisma.$transaction`; repositories accept the `tx` |

**Class rules**
- Constructor injection only, `private readonly` dependencies; no `new` of collaborators inside a class (except value objects).
- Explicit access modifiers on every member; member order: static → fields → constructor → public → protected → private.
- Composition over inheritance; inheritance only for template-method bases and `DomainError`.
- No mutable public fields; domain objects expose behaviour (`order.cancel(reason)`), not setters.
- Controllers: validate (global `ZodValidationPipe`), call **one** service method, map with the mapper. No logic, no Prisma.
- Errors: `DomainError` subclasses per case with an `ErrorCode`; one global `ProblemDetailsFilter` maps `ErrorCode → HTTP status` from one table.
- Events: published only through the outbox in the same transaction; consumed only by `BaseEventHandler` subclasses; services never call each other over HTTP.
- REST: `/api/v1`, plural kebab-case nouns, `201` + `Location` on create, `Idempotency-Key` on `POST /orders`, keyset pagination; `@Roles(UserRole.Seller)` guards + ownership checks inside services.
- Tests: domain classes → exhaustive unit tests; services → unit tests with in-memory adapters; adapters → integration tests (Testcontainers) via the shared contract suites.

### 6A.4 Frontend — arrow functions, structure, patterns (both sites)
**All functions are arrow functions** — components, hooks, handlers, utils, server functions:
```tsx
export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => { … };
export const useCart = () => { … };
export const formatMoney = (cents: number, currency: Currency): string => { … };
// Next.js files that need a default export:
const ProductPage = async ({ params }: ProductPageProps) => { … };
export default ProductPage;
```
No `function` declarations, no classes in frontend code (React error boundary via `react-error-boundary`).

**Folder structure**
```
src/
├── app/ (web, Next.js routes)  |  routes/ (admin, React Router)
├── features/
│   └── cart/
│       ├── components/   CartDrawer.tsx + CartDrawer.css
│       ├── hooks/        useCart.ts
│       ├── services/     cart.service.ts   (API calls via the typed client)
│       └── index.ts      (public API of the feature)
├── components/          shared UI primitives: Button/, Input/, Modal/, Badge/, Table/ … (tsx + css each)
├── api/                 schema.ts (generated) · client.ts (openapi-fetch instance)
├── constants/           *.constant.ts
├── enums/               *.enum.ts (frontend-only)
├── interfaces/          *.interface.ts
├── utils/               *.util.ts
└── styles/              tokens/ · base/ · layout/ · index.css   (see 6A.6)
```

**Patterns**
| Pattern | Rule |
|---|---|
| Presentational vs container | Presentational components: props in, JSX out, no fetching/state beyond UI. Containers wire data (hooks/services) to presentational components |
| Composition | Build with `children` / slots, not boolean prop explosions (`<Card><Card.Header/>…` via compound components) |
| Custom hooks | All reusable logic in `useXxx`; a hook returns an object, not a long tuple |
| State | Server state → Server Components (web) / TanStack Query (admin) · URL state (filters, sort, page) → search params · local → `useState`/`useReducer` · global (cart, auth) → small context + reducer; no extra state library |
| Effects | `useEffect` only to sync with external systems (SSE, subscriptions) — never for derived state or fetching |
| Services | Components never call `fetch` or build URLs; they call `features/*/services/*.service.ts`, which use the typed client |
| Forms | React Hook Form + zod resolver; server problem-details mapped back to fields; submit disabled while pending |
| UI states | Every data view: loading (skeleton), empty, error (with retry), success |
| Accessibility | Semantic HTML, labelled inputs, visible focus, keyboard reachable, colour never the only signal |
| Security | No `dangerouslySetInnerHTML` (JSON-LD from trusted data only); tokens never in `localStorage` |
| Tests | Vitest + React Testing Library through roles/labels; MSW for API mocks; Playwright for journeys |

| `frontend-web` (Next.js) | `frontend-admin` (React SPA) |
|---|---|
| Server Components by default; `'use client'` only on interactive leaves | All client-side; areas lazy-loaded (`/seller`, `/platform`) |
| Each route segment declares its mode (`export const dynamic = 'force-static'` / `revalidate`) matching §6.2 | Route guards by role |
| Server-only code in `*.server.ts` with `import 'server-only'` | TanStack Query key factory per feature (`orderKeys.list(filters)`), exact invalidation |
| Auth via httpOnly cookies read on the server | Access token in memory; one interceptor handles 401 → refresh → retry |
| `next/image`, Metadata API, JSON-LD; revalidate endpoint protected by a secret | Server-side pagination/sort/filter via URL params; virtualised lists > 200 rows |

### 6A.5 Design tokens — the full list (source: `docs/design-system.md`)
Two layers: **primitive tokens** (raw scale) → **semantic tokens** (meaning). Components use **semantic tokens only**. Both frontends ship the identical set (`scripts/check-tokens.mjs`).

**Colour — primitives**
| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| `--color-saffron-*` (brand) | #FFF4ED | #FFE6D5 | #FECCAA | #FDAC74 | #FB8A3C | #E8590C | #C2410C | #9A3412 | #7C2D12 | #431407 |
| `--color-ink-*` (neutral) | #FAFAF9 | #F5F5F4 | #E7E5E4 | #D6D3D1 | #A8A29E | #78716C | #57534E | #44403C | #292524 | #1C1917 |
| `--color-teal-*` (success / secondary) | #F0FDFA | #CCFBF1 | #99F6E4 | #5EEAD4 | #2DD4BF | #14B8A6 | #0F766E | #115E59 | #134E4A | #042F2E |
| `--color-amber-*` (warning) | #FFFBEB | #FEF3C7 | #FDE68A | #FCD34D | #FBBF24 | #F59E0B | #D97706 | #B45309 | #92400E | #451A03 |
| `--color-red-*` (danger) | #FEF2F2 | #FEE2E2 | #FECACA | #FCA5A5 | #F87171 | #EF4444 | #DC2626 | #B91C1C | #991B1B | #450A0A |
| `--color-blue-*` (info) | #EFF6FF | #DBEAFE | #BFDBFE | #93C5FD | #60A5FA | #3B82F6 | #2563EB | #1D4ED8 | #1E40AF | #172554 |

**Colour — semantic (light theme; dark theme swaps values under `[data-theme='dark']`)**
| Token | Value | Use |
|---|---|---|
| `--color-bg` / `--color-surface` / `--color-surface-raised` | ink-50 / #FFFFFF / #FFFFFF + shadow | Page, cards, popovers |
| `--color-text` / `--color-text-muted` / `--color-text-inverse` | ink-900 / ink-600 / #FFFFFF | Body, secondary, on brand |
| `--color-border` / `--color-border-strong` | ink-200 / ink-300 | Dividers, inputs |
| `--color-primary` / `--color-primary-hover` / `--color-primary-subtle` | saffron-600 / saffron-700 / saffron-50 | CTA buttons (saffron-600 on white passes AA for normal text; saffron-500 only for large text/icons) |
| `--color-success` / `--color-warning` / `--color-danger` / `--color-info` (+ `-subtle`) | teal-600 / amber-700 / red-600 / blue-600 (+ 50 shades) | Status badges, alerts |
| `--color-focus-ring` | saffron-500 @ 40 % | Focus outline |

**Spacing & padding** (4 px base)
| Token | `--space-0` | `-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-8` | `-10` | `-12` | `-16` | `-20` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Value | 0 | 4px | 8px | 12px | 16px | 20px | 24px | 32px | 40px | 48px | 64px | 80px |

| Padding token (semantic) | Value |
|---|---|
| `--padding-control` (button, input) | `var(--space-2) var(--space-4)` · `-sm`: `var(--space-1) var(--space-3)` · `-lg`: `var(--space-3) var(--space-6)` |
| `--padding-card` | `var(--space-6)` (mobile `var(--space-4)`) |
| `--padding-section` | `var(--space-16) 0` (mobile `var(--space-10) 0`) |
| `--padding-page-x` | `var(--space-4)` → `var(--space-6)` (md) → `var(--space-8)` (lg) |
| `--gap-stack` / `--gap-inline` / `--gap-grid` | `var(--space-4)` / `var(--space-2)` / `var(--space-6)` |

**Typography, shape, depth, motion, layout**
| Group | Tokens |
|---|---|
| Font family | `--font-sans: 'Inter Variable', system-ui, sans-serif` · `--font-display: 'Fraunces Variable', Georgia, serif` (headings on web only) · `--font-mono: 'JetBrains Mono', monospace` |
| Font size | `--text-xs 12px` · `--text-sm 14px` · `--text-md 16px` · `--text-lg 18px` · `--text-xl 20px` · `--text-2xl 24px` · `--text-3xl 30px` · `--text-4xl 36px` · `--text-5xl 48px` |
| Weight / line height | `--weight-regular 400` · `--weight-medium 500` · `--weight-semibold 600` · `--weight-bold 700` · `--leading-tight 1.2` · `--leading-normal 1.5` · `--leading-relaxed 1.7` |
| Radius | `--radius-sm 4px` · `--radius-md 8px` · `--radius-lg 12px` · `--radius-xl 16px` · `--radius-full 9999px` |
| Shadow | `--shadow-sm` · `--shadow-md` · `--shadow-lg` (ink-900 at 6–12 % opacity) |
| Z-index | `--z-base 0` · `--z-dropdown 100` · `--z-sticky 200` · `--z-overlay 300` · `--z-modal 400` · `--z-toast 500` |
| Breakpoints (custom media) | `--bp-sm 640px` · `--bp-md 768px` · `--bp-lg 1024px` · `--bp-xl 1280px` |
| Layout | `--container-max 1200px` · `--container-narrow 720px` · `--header-height 64px` · `--sidebar-width 248px` (admin) |
| Motion | `--duration-fast 120ms` · `--duration-normal 200ms` · `--duration-slow 320ms` · `--ease-standard cubic-bezier(.2,0,0,1)`; all motion off under `prefers-reduced-motion` |

### 6A.6 CSS patterns (BEM)
**Styles folder**
```
styles/
├── tokens/   colors.css · spacing.css · typography.css · radius.css · shadow.css · z-index.css · breakpoints.css · motion.css · layout.css
├── base/     reset.css · base.css (body, headings, links, focus-visible) · a11y.css (.visually-hidden)
├── layout/   container.css · stack.css · cluster.css · grid.css · sidebar.css   (layout primitives, also BEM blocks)
└── index.css (imports in this order: tokens → base → layout)
```
- **Block = component**: `ProductCard.tsx` ↔ `ProductCard.css` ↔ `.product-card`; element `.product-card__title`; modifier `.product-card--featured`, `.product-card__price--sale`; state `.is-open`, `.has-error` (only via JS state).
- **Layout primitives** handle spacing between things (`.stack` = vertical gap, `.cluster` = wrapping row, `.grid` = auto-fit columns, `.container` = max width + page padding); components never set outer margins on themselves.
- **Tokens only**: every colour, spacing, size, radius, shadow, z-index and duration is `var(--…)` — raw values fail lint.
- Property order inside a rule: position → display/box model → typography → visual → animation (Stylelint order).
- No ID selectors, no `!important`, no element selectors inside components, nesting depth ≤ 1, a block never styles another block's elements (use a modifier on the child block instead).
- Mobile-first: base styles for small screens, `@media (--bp-md)` to grow.
- Class names in JSX via a tiny arrow-function util `cx('product-card', isFeatured && 'product-card--featured')` — no manual string concatenation.

### 6A.7 Example — the same feature, both sides
```ts
// backend/packages/contracts/src/enums/order-status.enum.ts
export enum OrderStatus { Pending = 'PENDING', Reserved = 'RESERVED', Paid = 'PAID', Confirmed = 'CONFIRMED', Cancelled = 'CANCELLED' }

// backend/services/order/src/modules/orders/services/orders.service.ts
@Injectable()
export class OrdersService {
  public constructor(
    private readonly ordersRepository: OrdersRepository,     // abstract class (port)
    private readonly stateMachine: OrderStateMachine,
    private readonly outbox: OutboxWriter,
    private readonly transactionManager: TransactionManager,
  ) {}

  public async confirmPayment(orderId: string): Promise<Order> {
    return this.transactionManager.run(async (tx) => {
      const order = await this.ordersRepository.getById(orderId, tx);
      const next = this.stateMachine.transition(order.status, OrderEvent.PaymentSucceeded);
      const saved = await this.ordersRepository.updateStatus(order.id, next, tx);
      await this.outbox.add(EventFactory.create(EventType.OrderConfirmed, saved.id, { orderId: saved.id }), tx);
      return saved;
    });
  }
}
```
```tsx
// frontend-admin/src/features/orders/components/OrderStatusBadge.tsx
import { OrderStatus } from '@/api/schema';
import { ORDER_STATUS_TONE } from '@/constants/order.constant';
import { cx } from '@/utils/cx.util';
import './OrderStatusBadge.css';

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => (
  <span className={cx('order-status-badge', `order-status-badge--${ORDER_STATUS_TONE[status]}`)}>{status}</span>
);
```

### 6A.8 Enforcement
| Rule | Tool |
|---|---|
| Enums only in `*.enum.ts`, shared interfaces only in `*.interface.ts`, `UPPER_SNAKE` constants only in `*.constant.ts` | ESLint `no-restricted-syntax` (`TSEnumDeclaration`, `TSInterfaceDeclaration[id.name!=/Props$/]`, exported `UPPER_SNAKE` `const`) disabled only for those file globs |
| Frontend: arrow functions only | `func-style: ['error', 'expression']`, `prefer-arrow-callback`, `react/function-component-definition` (arrow), `no-restricted-syntax` for `ClassDeclaration` |
| Backend: classes only | `no-restricted-syntax` for top-level `FunctionDeclaration` / exported arrow functions (except `main.ts`, `common/decorators/**`); `explicit-member-accessibility`; `member-ordering` |
| Backend layers & module independence | `eslint-plugin-boundaries` (controller ↛ repository adapter, domain ↛ Nest/Prisma, module ↛ other module internals) |
| Frontend feature independence | `eslint-plugin-boundaries` (feature ↛ other feature internals; components ↛ features) |
| TS strictness, floating promises, return types | `typescript-eslint` type-aware rules |
| Import order, cycles, deep relatives | `eslint-plugin-import-x` (`order`, `no-cycle`), `no-restricted-imports` |
| `process.env` only in config, no `console` | `no-restricted-properties`, `no-console` |
| React hooks, a11y, Next.js | `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `@next/eslint-plugin-next` |
| BEM, tokens only, property order | Stylelint: `stylelint-selector-bem-pattern`, `stylelint-declaration-strict-value`, `stylelint-order`, `selector-max-id: 0`, `declaration-no-important` |
| Formatting, commits | Prettier · commitlint |
| API types fresh, tokens equal | `scripts/check-openapi.mjs`, `scripts/check-tokens.mjs` |
| Coverage | ≥ 80 % lines on domain classes, services, frontend utils and hooks |

---

## 7. Data design

### 7.1 Which database, and why
| Data | Store | Reason |
|---|---|---|
| Users, roles, refresh tokens, verification / reset tokens, seller applications | MySQL | Relational, unique constraints, small and strict |
| Orders, seller orders, order items, payments, outbox | MySQL | Money: ACID transactions, foreign keys, reporting with SQL |
| Products, shops, categories | MongoDB | Different attributes per category (size, colour, specs…), nested images/variants, localized `{ en, vi }` fields, text index per language |
| Stock | MongoDB (on product variant) | Kept with the product; atomic `findOneAndUpdate({ stock: { $gte: qty } })` prevents overselling |
| Reviews + rating summary | MongoDB | Document per review, aggregation pipeline for summary |
| Notifications, event log | MongoDB | Append-heavy, schemaless payloads, TTL index for old entries |
| Rate-limit counters, cache (incl. FX rates), locks, idempotency keys | Redis | Short-lived, shared across pods, needs atomic counters and TTL |

### 7.2 MySQL (Prisma, `prisma migrate` — SQL migrations checked in)
- `bazaar_identity`: `users(id, email UQ, password_hash, role, status, preferred_locale, email_verified_at, created_at)`, `refresh_tokens(id, user_id FK, token_hash, family_id, expires_at, revoked_at)`, `user_tokens(id, user_id FK, purpose, token_hash, expires_at, used_at)` (email verification / password reset), `seller_applications(id, user_id FK, shop_name, status, reviewed_by, reviewed_at)`
- `bazaar_order`: `orders(id, shopper_id, status, total_usd_cents, cancel_reason, idempotency_key UQ, created_at, updated_at)`, `seller_orders(id, order_id FK, seller_id, status, subtotal_usd_cents, shipped_at, delivered_at, cancelled_at)`, `order_items(id, seller_order_id FK, product_id, variant_sku, title_snapshot JSON, qty, unit_price_usd_cents)`, `payments(id, order_id FK, status, provider_ref, amount_usd_cents)`, `outbox(id, topic, msg_key, payload JSON, created_at, sent_at)`, `processed_events(event_id PK, processed_at)`
- Money is **always USD cents** (`*_usd_cents` columns, integers) — the only denomination stored; no FX data in any database. Indexes on `orders(shopper_id, created_at)`, `seller_orders(seller_id, status, id)`, `outbox(sent_at)`.

### 7.3 MongoDB (Prisma, replica set for transactions)
- `products { _id, shopId, slug UQ, title{ en, vi }, description{ en, vi }, categoryId, attributes{}, variants[{ sku, priceUsdCents, stock, attrs }], images[], status, rating{ avg, count }, createdAt }` — text index on title/description (both languages), compound index `(categoryId, status, variants.priceUsdCents)`.
- `categories { _id, slug, name{ en, vi }, path }`, `shops { _id, sellerId, slug, name, description{ en, vi } }`.
- `reviews`, `outbox`, `processed_events`, `notifications` (TTL 180 days), `event_log`.

### 7.4 `backend/db/` — schema and seed files (decided 2026-10-11)
All schema and seed data lives in plain files, one folder per database, easy to read and diff:
```
backend/db/
├── identity/      schema.sql · data.sql          (MySQL bazaar_identity)
├── order/         schema.sql · data.sql          (MySQL bazaar_order)
├── catalog/       schema.js  · data.js           (MongoDB bazaar_catalog — mongosh scripts)
└── notification/  schema.js                      (MongoDB bazaar_notification)
```
| File | Content | How it is kept right |
|---|---|---|
| `schema.sql` (MySQL) | Full current DDL of the database (tables, keys, indexes) in one readable file | Generated from the Prisma schema (`prisma migrate diff --from-empty --to-schema-datamodel --script`); CI fails if it is stale. Change history stays in `prisma/migrations/` |
| `data.sql` (MySQL) | Seed: admin, 3 sellers, demo shoppers (EN + VI locales), sample orders in every state | Hand-written, idempotent (`INSERT … ON DUPLICATE KEY UPDATE`), loaded by `make seed` and the seed Job on kind |
| `schema.js` (MongoDB) | Collections, JSON-Schema validators, all indexes (text, compound, unique, TTL) — Prisma cannot create these for MongoDB | Applied by `make db-schema` and an init Job on kind; checked by integration tests |
| `data.js` (MongoDB) | Seed: categories (EN/VI), 3 shops, 1,000 products with EN/VI text, placeholder images | Deterministic (fixed ids, generated in a loop), idempotent upserts |

The same files are used by docker compose (init), the kind Jobs, integration tests (fresh DB per run) and `make db-reset`.

---

## 8. Docker

- **Multi-stage Dockerfile** per app: `deps → build → runtime` on Node LTS Alpine (Next.js `output: 'standalone'`; admin → `nginx:alpine` serving static files). Non-root user, `HEALTHCHECK`, `.dockerignore`, service images < 200 MB.
- **docker-compose.yml**
  - default = infra only: `mysql`, `mongo` (single-node replica set), `redis`, `kafka` (KRaft), `kafka-init` (creates topics), `kafka-ui`, `minio` (+ bucket init), `mailpit`.
  - `--profile full` = infra + all 6 apps as containers.
- Ports (chosen not to clash with relay / real-estate / preclinic):

| Service | Port |
|---|---|
| web | 3100 |
| admin | 3200 |
| gateway | 4000 |
| catalog / order / notification | 4010 / 4020 / 4030 |
| MySQL | 3307 |
| MongoDB | 27018 |
| Kafka (host listener) | 9094 |
| Kafka UI | 8085 |
| Mailpit UI | 8026 |
| Redis | 6380 |
| MinIO API / console | 9002 / 9003 |

---

## 9. Kubernetes

### 9.1 Local cluster with kind
`infra/k8s/kind/kind-config.yaml`: 1 control-plane + 2 workers, `extraPortMappings` 80/443 → host, local registry (`localhost:5001`) so rebuilt images load fast (or `kind load docker-image`).

### 9.2 Manifests (Kustomize)
| Kind | Used for |
|---|---|
| Namespace | `bazaar` (apps), `bazaar-data` (stores), `observability` |
| Deployment + Service | web, admin, gateway, catalog, order, notification |
| StatefulSet + headless Service + PVC | MySQL, MongoDB, Redis, MinIO (local overlay only) |
| Kafka | **Strimzi operator** (Helm) + `Kafka` / `KafkaNodePool` / `KafkaTopic` resources — topics declared as code |
| ConfigMap / Secret | env per app; Secrets from `.env` via `secretGenerator` locally (Sealed Secrets / External Secrets in prod — next step) |
| Probes | `/health/live`, `/health/ready` (ready = DB + Kafka connected) |
| HPA | gateway, catalog (CPU 70 %) — needs metrics-server |
| PodDisruptionBudget | services, aws overlay |
| Ingress | Traefik: `bazaar.localhost` → web, `admin.bazaar.localhost` → admin, `/api` → gateway |
| Jobs | DB migrations as a Job before rollout; Mongo index Job |

### 9.3 Observability (watching the system)
- **k9s** — terminal UI to watch pods, logs, events live.
- **Kafka UI** — topics, messages, consumer lag.
Production-grade, the same three signals a real team runs (metrics · logs · traces), all in namespace `observability`, installed with Helm:

| Signal | Stack | Details |
|---|---|---|
| Metrics | **kube-prometheus-stack** (Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter, kube-state-metrics) | Every service exposes `/metrics` (prom-client: RED metrics per route, Kafka produce/consume counts, outbox backlog, saga state counts); `ServiceMonitor` per app; Strimzi Kafka exporter for consumer lag; mysqld-exporter + mongodb-exporter + redis-exporter |
| Logs | **Loki** + **Grafana Alloy** (collector, DaemonSet) | JSON logs (pino) with `traceId`, `service`, `env`; no PII in logs; retention 7 days locally |
| Traces | **OpenTelemetry** SDK (auto HTTP/Prisma/Kafka instrumentation + manual spans for saga steps) → **OTel Collector** → **Tempo** | Trace context carried in Kafka headers, so one trace goes web → gateway → order → Kafka → catalog → notification |
| Correlation | Grafana | Click from a metric spike → exemplar trace → its logs |
| Dashboards (as code, JSON in repo) | Grafana | Golden signals per service, Kafka (lag, throughput, DLQ size), databases, order funnel (created → confirmed / cancelled), Next.js SSR latency |
| SLOs + alerts (as code, `PrometheusRule`) | Prometheus + Alertmanager → Mailpit (email) locally | e.g. gateway availability 99.9 %, p95 < 200 ms, consumer lag > 1,000 for 5 min, DLQ not empty, outbox oldest unsent > 60 s, pod crash-looping; each alert links to its runbook section |
| Frontend | Web Vitals from Next.js + admin SPA → gateway `/telemetry` → Prometheus | LCP / INP / CLS per page type |
| Tools for you | **k9s**, **Kafka UI**, Grafana | Watching pods, topics and dashboards live |

On the dev laptop (compose) only the OTel Collector + Grafana LGTM all-in-one image runs, to keep it light; the full stack runs on staging (kind).

---

## 9A. AWS deployment with CDK

This is the **prod** environment of §0.2: written, tested and reviewed like a real team would, **but not deployed** (local-only project). The same Kubernetes manifests would run on **Amazon EKS**; the stateful parts move to AWS managed services. All of it is written in **CDK TypeScript** (same language as the rest of the repo, one toolchain). Verified locally with `cdk synth`, Jest assertions and cdk-nag — no AWS account needed.

### 9A.1 Local → AWS mapping
| Local (compose / kind) | AWS | Notes |
|---|---|---|
| kind cluster | **EKS** (managed node group, Graviton arm64 — same arch as the Mac) | Add-ons: AWS Load Balancer Controller, EBS CSI, metrics-server, External Secrets Operator, Pod Identity |
| MySQL StatefulSet | **Aurora MySQL** (Serverless v2) | Two databases: `bazaar_identity`, `bazaar_order`; Multi-AZ in prod |
| MongoDB StatefulSet | **MongoDB Atlas** (dedicated cluster in the same AWS region) | Real MongoDB — same features as local (text index, transactions, aggregation). Created from CDK with the official `awscdk-resources-mongodbatlas` constructs; private connection via **AWS PrivateLink**; Atlas API keys in Secrets Manager |
| Kafka (Strimzi) | **Amazon MSK** (provisioned, 2–3 brokers) | TLS + SASL/SCRAM so the Node client works without extra IAM plugins; topics created by a k8s Job |
| Traefik ingress | **ALB** via Ingress + AWS Load Balancer Controller | ACM certificate, HTTPS only |
| Static SSG pages + Next.js assets, admin SPA | **S3 + CloudFront** (OAC) | SSG pages and `/_next/static` served from CloudFront; SSR requests forwarded to the ALB origin |
| `.env` / k8s Secret | **Secrets Manager** → External Secrets → k8s Secret | DB passwords rotated by Secrets Manager |
| Local images | **ECR** (one repo per app, scan on push, lifecycle rule) | |
| Mailpit | **SES** (sandbox in dev) | |
| Redis StatefulSet | **ElastiCache** (Valkey/Redis OSS, cluster mode off, Multi-AZ replica in prod) | TLS + AUTH token from Secrets Manager |
| MinIO | **S3** (images bucket + backups bucket) | Same S3 API, only the endpoint/credentials change |
| Grafana / Prometheus | **CloudWatch** (Container Insights, alarms, dashboard); optional Amazon Managed Prometheus/Grafana | |
| — | **Route 53 + ACM**, **WAF** on CloudFront | Domain is a parameter; no domain = CloudFront default URL |

### 9A.2 CDK stacks (`infra/cdk/lib/stacks`)
| Stack | Contents | Depends on |
|---|---|---|
| `NetworkStack` | VPC 3 AZ (public / private / isolated subnets), NAT (1 in dev, 1 per AZ in prod), VPC endpoints (ECR, S3, Secrets Manager, CloudWatch) | — |
| `DataStack` | Aurora MySQL, MongoDB Atlas project + cluster + PrivateLink endpoint, MSK cluster, ElastiCache, security groups (only from EKS nodes), secrets, KMS keys | Network |
| `ClusterStack` | EKS cluster, node group, add-ons (Helm via CDK), IAM roles for service accounts, namespaces | Network, Data |
| `EdgeStack` | S3 buckets (static, admin, product images), CloudFront distributions, WAF, ACM, Route 53 records | Cluster (ALB origin) |
| `CiStack` | ECR repos, GitHub OIDC provider + deploy role (least privilege, no access keys) | — |
| `ObservabilityStack` | CloudWatch dashboard, alarms (5xx rate, p95 latency, MSK consumer lag, Aurora CPU; Atlas alerts go to the same SNS topic) → SNS email | Data, Cluster |

- Environments **dev** and **prod** from one typed config file (`lib/config/environments.ts`): sizes, AZ count, deletion protection, retention. No magic values inside stacks (DS-01 applies to infra too).
- Tags on every resource: `project=bazaar`, `env`, `owner`.
- Removal policy: `RETAIN` + deletion protection for data in prod, `DESTROY` in dev.

### 9A.3 Who would deploy what (documented and scripted, not run)
| Layer | Tool | When |
|---|---|---|
| AWS infrastructure | `cdk deploy` (GitHub Actions with OIDC role, manual approval for prod) | Infra changes |
| App images | GitHub Actions → ECR (tag = git sha) | Every merge to main |
| App rollout on EKS | `kubectl apply -k infra/k8s/overlays/aws` with the new image tag; migration Job first | After images are pushed |
| Static assets | `aws s3 sync` + CloudFront invalidation for SSG pages / admin | After web/admin build |

Argo CD (GitOps) instead of `kubectl apply` is a listed next step (ADR 0009).

### 9A.4 Quality checks for the CDK code
- Jest: fine-grained assertions (`Template.fromStack`, e.g. "Aurora is encrypted", "no security group open to 0.0.0.0/0 on DB ports") + snapshot test.
- **cdk-nag** (AwsSolutions pack) runs on every `cdk synth`; each suppression has a written reason.
- `cdk diff` posted on PRs that touch `infra/cdk`.
- Cost: monthly estimate for prod made with AWS Pricing Calculator at P8 and written in `docs/aws-cost.md` (what a client would pay).

---

## 10. Testing strategy
| Layer | Tool | What |
|---|---|---|
| Unit | Jest (services), Vitest (frontend, packages) | Domain rules, saga transitions, components |
| Integration | Jest + **Testcontainers** (MySQL, Mongo, Kafka) | Repositories, outbox relay, consumer idempotency, concurrent stock decrement |
| Contract | zod schemas from `contracts` checked in producer and consumer tests | Event shape never drifts |
| E2E | Playwright against `docker compose --profile full` | Browse → buy → seller fulfils → notification |
| Load | k6 | NFR-02/03 numbers written into README |
| Cluster smoke | CI: create kind cluster, apply local overlay, wait for rollout, curl health | K8s manifests actually work |

---

## 11. CI/CD (GitHub Actions)
Every workflow step is also a Makefile target, so the whole pipeline runs on the laptop (`make ci`, `make release`).
- One workflow per project, triggered only by its own folder (path filters):
  - `backend.yml` (`backend/**`): install → lint → typecheck → unit → integration (Testcontainers) → build (Turborepo cache) → OpenAPI freshness check → `npm audit`.
  - `web.yml` (`frontend-web/**`, `backend/openapi/**`): install → generated-schema check → lint (ESLint + Stylelint) → typecheck → unit → build.
  - `admin.yml` (`frontend-admin/**`, `backend/openapi/**`): same steps for the admin SPA.
  - Repo-wide on every PR: commitlint, `scripts/check-tokens.mjs`.
- `images.yml`: build multi-arch images (amd64 + arm64), Trivy scan, tag = git sha. Locally: `make images` + `make k8s-load`.
- `k8s-smoke.yml`: kind cluster + Kustomize apply + rollout status + curl health. Locally: `make release` (= promote to staging).
- `cdk.yml`: on PRs touching `infra/cdk` → Jest → `cdk synth` (cdk-nag). Locally: `make aws-test aws-synth`.
- `deploy.yml`: the real prod pipeline (OIDC → ECR → `cdk deploy` → migration Job → `kubectl apply -k overlays/aws` → S3 sync + CloudFront invalidation → smoke test), written in full but **manual-trigger only and disabled** — no AWS account.

---

## 12. Local tooling — what to install

Already on the machine: Node 26, npm, Docker 29.8.1 (arm64).

| Tool | Need? | Purpose |
|---|---|---|
| **kind** | **Yes** | Runs a real Kubernetes cluster inside Docker containers. It *is* the cluster — not a monitoring tool |
| **kubectl** | **Yes** | Talk to the cluster |
| **helm** | Yes | Install Strimzi (Kafka), Traefik, kube-prometheus-stack |
| **k9s** | Recommended | The actual "easy to watch" tool: live pods, logs, events in a terminal UI |
| **AWS CLI v2** | Yes (from P8) | Credentials / SSO, `aws eks update-kubeconfig`, S3 sync |
| **AWS CDK CLI** | No global install | Pinned in `infra/cdk/package.json`, run with `npx cdk` |
| kustomize | No | Built into `kubectl apply -k` |
| minikube / Docker Desktop k8s | No | kind replaces them |

Simplest install (one line, easy to update later):
```bash
brew install kind kubectl helm k9s awscli
```
Or the manual binary from the request — it also has to be moved into PATH:
```bash
[ $(uname -m) = arm64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.33.0/kind-darwin-arm64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
kind version
```
Give Docker at least **6 CPU / 10 GB RAM** — Kafka + MySQL + Mongo + 6 apps + Prometheus inside kind are heavy.

---

## 13. Delivery phases (work breakdown)

| Phase | Output | Done when |
|---|---|---|
| **P0 Foundation** | Repo tooling (husky, commitlint, prettier), `backend/` workspace + Turborepo + TS/ESLint configs, `contracts`, `nest-common`, Prisma ↔ MongoDB spike, `docs/design-system.md`, `docs/backlog.md`, `CONTRIBUTING.md` (from §6A), Makefile, `.env.example`, compose infra (frontend projects are scaffolded in P3 / P6) | `make up` starts infra healthy; `make lint test` green |
| **P1 Identity + gateway** | Register/login/refresh/roles, rate limit, OpenAPI exported to `backend/openapi/gateway.json` | Auth integration tests pass |
| **P2 Catalog** | Shops, products, categories (EN/VI), search, seller CRUD, images on MinIO, Redis read cache, `db/catalog/schema.js` + `data.js` | Search + filters work through gateway |
| **P3 Web (SSG + SSR)** | Landing pages, catalog/product SSR, ISR revalidate, SEO, cart | Lighthouse ≥ 90 perf/SEO/a11y on landing + product |
| **P4 Orders + Kafka saga** | Order service, outbox relay, stock reservation, fake payment, timeouts, DLQ | Concurrent-order test shows zero oversell; saga tests green |
| **P5 Notifications + live status** | Notification service, Mailpit emails, in-app list, SSE in gateway | Shopper sees status change live |
| **P6 Admin site (SPA)** | Seller products/orders/dashboard, admin moderation/stats | Playwright seller + admin journeys green |
| **P7 Docker + Kubernetes** | Dockerfiles, compose full profile, kind script, Kustomize base/overlays, Strimzi, Traefik, migration Jobs, HPA | `make k8s-up` → app reachable at `http://bazaar.localhost` |
| **P8 AWS with CDK** | `infra/cdk` (6 stacks, dev + prod config), `overlays/aws`, cdk-nag, Jest tests, `cdk.yml` + `deploy.yml`, cost estimate | `cdk synth` clean with cdk-nag; tests green; `docs/aws-cost.md` written |
| **P9 Observability + quality** | OTel, Prometheus/Grafana dashboards, CloudWatch alarms, k6 load test, CI workflows, k8s smoke | CI green; numbers in README |
| **P10 Docs & polish** | draw.io diagrams + PNGs, ADRs, runbook, README with screenshots | Ready to demo to clients |

---

## 14. Makefile targets (planned)
`help · install · up · up-full · down · migrate · db-schema · seed · db-reset · dev · test · test-int · e2e · lint · gen-client · k8s-up (kind create + helm deps + apply local overlay) · k8s-down · k8s-load (build & load images) · k8s-status · ci (full CI pipeline locally) · images · release (promote current sha to staging/kind) · rollback · aws-synth · aws-test · load-test · drill-<name> · diagrams`

---

## 15. Documentation deliverables
- **draw.io** (`docs/architecture/`): `architecture.drawio`, `k8s_deployment.drawio`, `aws_deployment.drawio` (VPC/AZ/subnets, EKS, Aurora, MongoDB Atlas via PrivateLink, MSK, CloudFront, ALB), `aws_cicd.drawio` (GitHub OIDC → ECR → CDK → EKS), `erd_mysql.drawio`, `collections_mongo.drawio`, `event_map.drawio` (topics × producers × consumers), `order_state.drawio`, `rendering_modes.drawio`, and a sequence per flow: B1 sign-up, B2 browse (SSR), B3 place order saga, B4 stock rejected, B5 payment failed + compensation, B6 live status (SSE), B7 product update → ISR revalidate.
- **ADRs** (`docs/adr/`):
  0001 One repo, three independent projects (backend workspace, frontend-web, frontend-admin); frontends get types from OpenAPI ·
  0002 Next.js for SSG/SSR, separate React SPA for the admin site ·
  0003 Gateway/BFF + 3 services, database per service ·
  0004 MySQL vs MongoDB split ·
  0005 Kafka choreography saga + transactional outbox ·
  0006 Idempotent consumers, retry + DLQ ·
  0007 Kubernetes with Kustomize, kind locally, Strimzi for Kafka ·
  0008 BEM + design tokens, no CSS framework ·
  0009 AWS: EKS + managed data services, CDK in TypeScript, deploy by GitHub OIDC (Argo CD as next step) ·
  0010 MongoDB on AWS: MongoDB Atlas (not DocumentDB) ·
  0011 Prisma for both MySQL and MongoDB
- `docs/runbook.md`: start/stop, reset data, replay DLQ, read consumer lag, common failures, AWS deploy / rollback / destroy.
- `docs/aws-cost.md`: monthly estimate per environment.

---

## 16. Risks
| Risk | Mitigation |
|---|---|
| Laptop resources (kind + Kafka + 2 DBs) | Compose for daily dev; kind only from P7; local overlay runs 1 replica with small limits |
| Kafka client library maintenance | KafkaJS is unmaintained → `@confluentinc/kafka-javascript` chosen; wrapped in `nest-common` so it can be swapped in one place; native librdkafka build verified on arm64 Mac and in the Alpine image at P0 |
| Frontends drift from the API or from each other (no shared packages) | Generated API types + CI freshness checks; token-equality check (§4.1) |
| Atlas is outside AWS billing / IAM | Only on paper (local-only project); access via PrivateLink + scoped API keys documented in ADR 0010 |
| Saga complexity / stuck orders | State machine in one pure file with unit tests; reservation timeout job; DLQ + runbook |
| Mongo transactions need a replica set | Single-node replica set in compose and k8s (`--replSet rs0` + init) |
| Scope creep | Phases are gated; out-of-scope list is explicit |
| Dependency versions | Exact versions pinned at P0 scaffold; Renovate config |
| Prod (AWS) is never really run, so mistakes could hide | Jest assertions + cdk-nag + the same manifests proven on kind; `deploy.yml` reviewed step by step in an ADR |
| Prisma's MongoDB support is narrower than its SQL support (no migrations, no text index / positional array updates in the query API; newest Prisma major may lag on MongoDB) | Spike at P0: pin the Prisma version that supports MongoDB for all services; indexes created by a script; text search and the atomic stock decrement use `$runCommandRaw` inside one repository file each, covered by integration tests |

---

## 17. Decisions (answered 2026-10-11)

| # | Question | Decision |
|---|---|---|
| D1 | Product domain & name | **Bazaar — multi-vendor marketplace** |
| D2 | Frontend framework | **Next.js (React)** for the **customer site** (SSG + SSR + ISR) |
| D3 | Admin site | **Separate React SPA** (Vite + React Router), sellers + platform admins, served by nginx |
| D12 | Frontend repo layout | **Two independent projects in the Bazaar repo** (`frontend-web/`, `frontend-admin/`), no shared workspace with each other or with the backend |
| D13 | Sharing types / tokens with frontends | **Generated from the gateway OpenAPI** (openapi-typescript); each frontend keeps its own `tokens.css`, kept equal by a CI check |
| D15 | Orders across sellers | **One `Order` (one payment) split into `SellerOrder`s**, each fulfilled by its seller |
| D16 | Fulfilment states | **SHIPPED → DELIVERED** per seller order; shopper may cancel before shipping |
| D17 | Language & currency | **EN + VI** everywhere; **databases store only USD cents**; conversion/display via an external FX service behind the gateway `currency` module (Redis-cached); VND display only |
| D18 | Redis | **Required**: rate limits, cache, locks, idempotency keys (ElastiCache in prod) |
| D19 | Delivery workflow | **Commit straight to `main`** after each finished ticket (no PRs) |
| D20 | Schema & seed files | **`backend/db/<database>/schema.sql|js` + `data.sql|js`**; code and docs in English |
| D14 | Toolchain versions (checked 2026-10-11) | **TypeScript 6.0.x** (TS 7 not yet supported by typescript-eslint / ts-jest) · **NestJS 12** · **Kafka client `@confluentinc/kafka-javascript`** (KafkaJS unmaintained) · **Prisma latest stable** (not the 8.0 RC; MongoDB support verified by the P0 spike) · Node 24 LTS in images, engines `>=24` |
| D4 | ORM | **Prisma** for both MySQL and MongoDB (risks and workarounds in §16) |
| D5 | Kafka on k8s | **Strimzi operator** |
| D6 | Observability | **Production-grade full stack** (§9.3): Prometheus + Alertmanager + Grafana, Loki, Tempo, OpenTelemetry, SLOs |
| D7 | Git remote | **https://github.com/deputychinh/Bazaar.git** |
| D8 | AWS: code only or live deploy? | **Local only.** CDK code + tests + `cdk synth`, never deployed; staging = kind |
| D9 | CDK language | **TypeScript** |
| D10 | MongoDB on AWS (prod, on paper) | **MongoDB Atlas** on AWS via PrivateLink, created from CDK (real MongoDB, same as local) |
| D11 | Compute on AWS (on paper) | **EKS**; EC2 + k3s demo host = next step |
