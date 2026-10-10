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
- **Definition of Done:** code + tests (unit, plus integration when DB/Kafka is touched), lint/typecheck green, docs/ADR updated, works in staging (kind), reviewed.
- **Git:** trunk-based, short branches `feat/BZ-012-order-saga`, **Conventional Commits**, PR template (what / why / how tested / screenshots), squash merge, `main` always releasable.
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
| F4 | Auth: sign up, sign in, refresh, roles (shopper, seller, admin) | gateway (MySQL), JWT access + httpOnly refresh cookie |
| F5 | Cart (client state) and checkout | SSR shell + client components · order-service |
| F6 | Order saga: create → reserve stock → pay (fake provider) → confirm / cancel | order-service (MySQL) ⇄ Kafka ⇄ catalog-service |
| F7 | Shopper "My orders" with live status | client components, SSE from gateway |
| F8 | Admin site — seller area: products CRUD, stock, images, orders queue, dashboard | SPA |
| F9 | Admin site — platform area: approve sellers, moderate products, platform stats | SPA |
| F10 | Notifications: email (Mailpit locally) + in-app list on order events | notification-service (Mongo), Kafka consumer |
| F11 | Reviews after delivery, rating summary on product | catalog-service, event-driven rating update |
| F12 | Event log viewer for admin | notification-service stores every event |

### Out of scope (written as "next steps")
Real payment provider, multi-currency, shipping carriers, recommendations, mobile app, i18n beyond EN/VI, multi-region.

---

## 2A. Requirements → design standards → decisions

### 2A.1 Functional requirements (FR)
| ID | Requirement | Actor | Priority |
|---|---|---|---|
| FR-01 | Public marketing pages load as static HTML | Visitor | Must |
| FR-02 | Catalog and product pages are indexable by search engines and show current price/stock | Visitor | Must |
| FR-03 | Sign up / in / out; roles shopper, seller, admin | All | Must |
| FR-04 | Search products by text, filter by category, price, rating; sort; paginate | Shopper | Must |
| FR-05 | Place an order from the cart; stock is never oversold | Shopper | Must |
| FR-06 | Order status moves PENDING → RESERVED → PAID → CONFIRMED (or CANCELLED with reason) and the shopper sees it live | Shopper | Must |
| FR-07 | Seller manages products and stock; sees and fulfils their orders | Seller | Must |
| FR-08 | Shopper and seller get a notification on every order state change | System | Should |
| FR-09 | Admin approves sellers and hides products | Admin | Should |
| FR-10 | Reviews after delivery; product rating updates automatically | Shopper | Should |
| FR-11 | Dashboards: seller sales per day, admin GMV / orders / top sellers | Seller, Admin | Could |

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
| DS-08 | Same NestJS module layout in every service: `controller → service → repository`; domain rules have no framework imports |
| DS-09 | Config only from env, validated at boot (zod); fail fast |
| DS-10 | Utils have plain names (`formatMoney`, `toSlug`, `sleep`) and live in one `utils` folder per package |

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
```
src/
├── main.ts                 # bootstrap: config check, Helmet, validation pipe, graceful shutdown
├── app.module.ts
├── config/                 # env schema (zod) → typed Config
├── <feature>/
│   ├── <feature>.controller.ts     # HTTP only, DTO in/out
│   ├── <feature>.service.ts        # use cases, transactions
│   ├── <feature>.repository.ts     # DB access only
│   ├── <feature>.entity.ts | .schema.ts
│   ├── <feature>.events.ts         # Kafka handlers
│   └── <feature>.rules.ts          # pure domain rules, unit tested
└── health/
```

### 5.2 Kafka
- Client: **`@confluentinc/kafka-javascript`** (actively maintained, librdkafka-based, KafkaJS-compatible API). KafkaJS — and therefore the built-in `@nestjs/microservices` Kafka transport — is no longer maintained (last release 2023), so it is not used. Producer and consumer are wrapped in `nest-common` (`EventProducer`, `EventConsumer`), started inside each Nest app's lifecycle hooks; swapping the library touches one folder.
- **Topics** (names only in `contracts/topics.ts`), 3 partitions locally, key = aggregate id (keeps order per order/product):

| Topic | Producer | Consumers | Events |
|---|---|---|---|
| `order.events` | order | catalog, notification, gateway | `OrderCreated`, `OrderPaid`, `OrderConfirmed`, `OrderCancelled`, `OrderDelivered` |
| `inventory.events` | catalog | order, notification | `StockReserved`, `StockRejected`, `StockReleased` |
| `catalog.events` | catalog | notification, web revalidate hook | `ProductPublished`, `ProductUpdated`, `ProductHidden`, `RatingUpdated` |
| `identity.events` | gateway | notification | `UserRegistered`, `SellerApproved` |
| `<topic>.retry` / `<topic>.dlq` | nest-common | ops | failed messages after N retries |

- **Envelope** (one interface in contracts): `{ eventId, type, version, occurredAt, aggregateId, traceId, payload }`.
- **Outbox**: order-service writes `orders` row + `outbox` row in one MySQL transaction; a relay (in nest-common) polls `outbox` → publishes → marks sent. Catalog does the same with an `outbox` collection inside a Mongo transaction (replica set).
- **Idempotency**: each consumer stores `eventId` in `processed_events` in the same transaction as the effect.

### 5.3 Order saga (choreography)
```
Shopper ─POST /orders→ gateway → order-svc: Order(PENDING) + OrderCreated
OrderCreated  → catalog-svc: atomic decrement where stock ≥ qty
                 ├ ok   → StockReserved  → order-svc: RESERVED → fake payment
                 │                         ├ ok   → PAID → CONFIRMED + OrderConfirmed
                 │                         └ fail → CANCELLED + OrderCancelled → catalog releases stock
                 └ fail → StockRejected  → order-svc: CANCELLED(reason=OUT_OF_STOCK)
Every order.* event → notification-svc (email + in-app) and gateway (SSE push to the shopper)
Reservation timeout (15 min, scheduled job in order-svc) → cancel + release
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

### 6.3 Shared frontend rules
- **Brand palette** (one set, defined in `docs/design-system.md`, copied into each frontend's `src/styles/tokens.css`, kept equal by `scripts/check-tokens.mjs`) — "Saffron & Ink":
  `--color-brand-500 #E8590C` (saffron, CTA) · `--color-brand-600 #C2410C` (hover) · `--color-ink-900 #1C1917` (text) · `--color-ink-600 #57534E` · `--color-sand-50 #FAFAF9` (background) · `--color-teal-600 #0F766E` (success/secondary) · `--color-red-600 #DC2626` (danger) · `--color-amber-500 #F59E0B` (warning). Contrast checked for AA at P0; dark theme via token swap.
- **CSS**: plain CSS files with BEM (`.product-card__price--sale`), tokens only, Stylelint (`stylelint-selector-bem-pattern`, `declaration-strict-value`). No Tailwind, no CSS-in-JS.
- **Data**: each frontend generates `src/api/schema.ts` from `backend/openapi/gateway.json` (openapi-typescript) and calls the API through `openapi-fetch` (typed, tiny). web: server-side fetch in Server Components; admin: TanStack Query. Enums come from the generated schema.
- **Tests**: Vitest + React Testing Library; Playwright for journeys.

---

## 7. Data design

### 7.1 Which database, and why
| Data | Store | Reason |
|---|---|---|
| Users, roles, refresh tokens | MySQL | Relational, unique constraints, small and strict |
| Orders, order items, payments, outbox | MySQL | Money: ACID transactions, foreign keys, reporting with SQL |
| Products, shops, categories | MongoDB | Different attributes per category (size, colour, specs…), nested images/variants, text index |
| Stock | MongoDB (on product variant) | Kept with the product; atomic `findOneAndUpdate({ stock: { $gte: qty } })` prevents overselling |
| Reviews + rating summary | MongoDB | Document per review, aggregation pipeline for summary |
| Notifications, event log | MongoDB | Append-heavy, schemaless payloads, TTL index for old entries |

### 7.2 MySQL (Prisma, `prisma migrate` — SQL migrations checked in)
- `bazaar_identity`: `users(id, email UQ, password_hash, role, status, created_at)`, `refresh_tokens(id, user_id FK, token_hash, expires_at, revoked_at)`
- `bazaar_order`: `orders(id, shopper_id, status, total_cents, currency, cancel_reason, created_at, updated_at)`, `order_items(id, order_id FK, product_id, variant_sku, seller_id, qty, unit_price_cents)`, `payments(id, order_id FK, status, provider_ref, amount_cents)`, `outbox(id, topic, msg_key, payload JSON, created_at, sent_at)`, `processed_events(event_id PK, processed_at)`
- Money as integer cents. Indexes on `orders(shopper_id, created_at)`, `order_items(seller_id, order_id)`, `outbox(sent_at)`.

### 7.3 MongoDB (Prisma, replica set for transactions)
- `products { _id, shopId, slug UQ, title, description, categoryId, attributes{}, variants[{ sku, priceCents, stock, attrs }], images[], status, rating{ avg, count }, createdAt }` — text index on title/description, compound index `(categoryId, status, variants.priceCents)`.
- `shops`, `categories` (tree by `path`), `reviews`, `outbox`, `processed_events`, `notifications` (TTL 180 days), `event_log`.

---

## 8. Docker

- **Multi-stage Dockerfile** per app: `deps → build → runtime` on Node LTS Alpine (Next.js `output: 'standalone'`; admin → `nginx:alpine` serving static files). Non-root user, `HEALTHCHECK`, `.dockerignore`, service images < 200 MB.
- **docker-compose.yml**
  - default = infra only: `mysql`, `mongo` (single-node replica set), `kafka` (KRaft), `kafka-init` (creates topics), `kafka-ui`, `mailpit`.
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

---

## 9. Kubernetes

### 9.1 Local cluster with kind
`infra/k8s/kind/kind-config.yaml`: 1 control-plane + 2 workers, `extraPortMappings` 80/443 → host, local registry (`localhost:5001`) so rebuilt images load fast (or `kind load docker-image`).

### 9.2 Manifests (Kustomize)
| Kind | Used for |
|---|---|
| Namespace | `bazaar` (apps), `bazaar-data` (stores), `observability` |
| Deployment + Service | web, admin, gateway, catalog, order, notification |
| StatefulSet + headless Service + PVC | MySQL, MongoDB (local overlay only) |
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
| Metrics | **kube-prometheus-stack** (Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter, kube-state-metrics) | Every service exposes `/metrics` (prom-client: RED metrics per route, Kafka produce/consume counts, outbox backlog, saga state counts); `ServiceMonitor` per app; Strimzi Kafka exporter for consumer lag; mysqld-exporter + mongodb-exporter |
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
| Grafana / Prometheus | **CloudWatch** (Container Insights, alarms, dashboard); optional Amazon Managed Prometheus/Grafana | |
| — | **Route 53 + ACM**, **WAF** on CloudFront | Domain is a parameter; no domain = CloudFront default URL |

### 9A.2 CDK stacks (`infra/cdk/lib/stacks`)
| Stack | Contents | Depends on |
|---|---|---|
| `NetworkStack` | VPC 3 AZ (public / private / isolated subnets), NAT (1 in dev, 1 per AZ in prod), VPC endpoints (ECR, S3, Secrets Manager, CloudWatch) | — |
| `DataStack` | Aurora MySQL, MongoDB Atlas project + cluster + PrivateLink endpoint, MSK cluster, security groups (only from EKS nodes), secrets, KMS keys | Network |
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
| **P0 Foundation** | Repo tooling (husky, commitlint, prettier), `backend/` workspace + Turborepo + TS/ESLint configs, `contracts`, `nest-common`, Prisma ↔ MongoDB spike, `docs/design-system.md`, `docs/backlog.md`, Makefile, `.env.example`, compose infra (frontend projects are scaffolded in P3 / P6) | `make up` starts infra healthy; `make lint test` green |
| **P1 Identity + gateway** | Register/login/refresh/roles, rate limit, OpenAPI exported to `backend/openapi/gateway.json` | Auth integration tests pass |
| **P2 Catalog** | Shops, products, categories, search, seller CRUD, images (local disk / MinIO), seed (1k products) | Search + filters work through gateway |
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
`help · install · up · up-full · down · migrate · seed · dev · test · test-int · e2e · lint · gen-client · k8s-up (kind create + helm deps + apply local overlay) · k8s-down · k8s-load (build & load images) · k8s-status · ci (full CI pipeline locally) · images · release (promote current sha to staging/kind) · rollback · aws-synth · aws-test · load-test · drill-<name> · diagrams`

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
| D14 | Toolchain versions (checked 2026-10-11) | **TypeScript 6.0.x** (TS 7 not yet supported by typescript-eslint / ts-jest) · **NestJS 12** · **Kafka client `@confluentinc/kafka-javascript`** (KafkaJS unmaintained) · **Prisma latest stable** (not the 8.0 RC; MongoDB support verified by the P0 spike) · Node 24 LTS in images, engines `>=24` |
| D4 | ORM | **Prisma** for both MySQL and MongoDB (risks and workarounds in §16) |
| D5 | Kafka on k8s | **Strimzi operator** |
| D6 | Observability | **Production-grade full stack** (§9.3): Prometheus + Alertmanager + Grafana, Loki, Tempo, OpenTelemetry, SLOs |
| D7 | Git remote | **https://github.com/deputychinh/Bazaar.git** |
| D8 | AWS: code only or live deploy? | **Local only.** CDK code + tests + `cdk synth`, never deployed; staging = kind |
| D9 | CDK language | **TypeScript** |
| D10 | MongoDB on AWS (prod, on paper) | **MongoDB Atlas** on AWS via PrivateLink, created from CDK (real MongoDB, same as local) |
| D11 | Compute on AWS (on paper) | **EKS**; EC2 + k3s demo host = next step |
