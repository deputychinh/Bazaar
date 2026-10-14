# Bazaar — multi-vendor marketplace

A production-style fullstack project run entirely on a laptop: **React with three rendering modes
(SSG · SSR · SPA)**, **NestJS services talking over Kafka**, **MySQL + MongoDB + Redis**, shipped with
**Docker** and **Kubernetes** (kind), with the AWS production environment written in **CDK**.

> Status: **P2 Catalog done** · next: P3 Customer site (Next.js). Full plan: [`docs/plan.md`](docs/plan.md) ·
> backlog: [`docs/backlog.md`](docs/backlog.md).

## Stack
| Area | Choice |
|---|---|
| Customer site | Next.js (React 19) — landing pages SSG, catalog SSR + ISR, EN / VI |
| Admin site | React SPA (Vite) — sellers and platform admins |
| Backend | NestJS 12 (ESM), TypeScript 6, one gateway + catalog, order, notification services |
| Messaging | Apache Kafka 4.3 (KRaft), transactional outbox, retry + dead-letter topics |
| Data | MySQL 8.4 (identity, orders — money in USD cents) · MongoDB 8 (catalog, notifications) · Redis 8 · S3-compatible storage |
| ORM | Prisma 6.19 for MySQL and MongoDB ([ADR 0011](docs/adr/0011-prisma-for-mysql-and-mongodb.md)) |
| Quality | ESLint rules for the coding conventions, Vitest, Testcontainers-style integration tests, Playwright |
| Platform | Docker Compose (dev) · Kubernetes on kind with Strimzi (staging) · AWS CDK (prod, not deployed) |

## Repository layout
Three independent projects in one repo ([ADR 0001](docs/adr/0001-one-repo-three-independent-projects.md)):
```
backend/          NestJS services + shared packages (npm workspaces, Turborepo)
  packages/contracts     enums, constants, interfaces, event contracts (single source)
  packages/nest-common   config, logging, health, errors, Kafka, outbox
  db/                    schema.sql / data.sql (MySQL) · schema.js / data.js (MongoDB)
frontend-web/     Next.js customer site            (from P3)
frontend-admin/   React SPA admin site             (from P6)
infra/            docker init scripts · k8s (P7) · cdk (P8)
docs/             plan, backlog, design system, ADRs, diagrams
```

## Quick start
Prerequisites: Node 24+, Docker Desktop (12 GB RAM recommended), GNU Make.
If Docker Desktop's CLI comes from Homebrew, add its helpers to your PATH (once, in `~/.zshrc`):
`export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"`.

```bash
make install     # tooling + backend dependencies, creates .env from .env.example
make up          # MySQL, MongoDB, Redis, Kafka (+ topics), Kafka UI, object storage, Mailpit
make ci          # lint, typecheck, unit tests, build
make test-int    # integration tests against the running infrastructure
make dev-gateway # gateway on http://localhost:4000 (API docs: /api/docs)
make dev-catalog # catalog on http://localhost:4010, also reachable through the gateway
make help        # every command
```

Everything from container images, behind an edge proxy that mirrors the Kubernetes ingress:

```bash
make up-full     # builds the images, migrates, seeds, starts all six apps
                 # → http://bazaar.localhost:8000 · http://admin.bazaar.localhost:8000
ADMIN_URL=http://admin.bazaar.localhost:8000 GATEWAY_URL=http://bazaar.localhost:8000 make e2e
```

Staging on Kubernetes (kind): `make k8s-up` → http://bazaar.localhost — see [docs/k8s.md](docs/k8s.md).
Production on AWS exists as tested CDK code, never deployed: `make aws-test aws-synth` — see [docs/aws.md](docs/aws.md) and [docs/aws-cost.md](docs/aws-cost.md).

Demo data: `make migrate db-schema seed` loads 7 accounts, 13 categories, 3 shops and 1,000 bilingual products.
Demo accounts, password **`Bazaar@2026!`**: `admin@bazaar.test`,
`seller.minh@bazaar.test`, `seller.anna@bazaar.test`, `shopper.linh@bazaar.test`, `shopper.tom@bazaar.test`.

| Local tool | URL |
|---|---|
| Kafka UI | http://localhost:8085 |
| Mailpit (emails) | http://localhost:8026 |
| Object storage console | http://localhost:9003 |

All ports are bound to `127.0.0.1`. Credentials in `.env.example` are for local use only.

## Performance (k6, `make load-test`)
Measured on staging (kind) on the development laptop — Apple Silicon, Docker Desktop with 8 CPU /
15.6 GB, one replica of every app, no network between client and cluster. Numbers from a laptop are
a floor for code regressions, not a capacity promise; run the same scripts against a real environment
before quoting figures.

| Target | Scenario | Result | Goal |
|---|---|---|---|
| NFR-03 public API reads | 200 req/s for 2 min (products, listings, search, categories) | p95 **10.6 ms**, p99 21.9 ms | p95 < 200 ms |
| NFR-02 product page TTFB | 30 pages/s, warm ISR cache, EN + VI | p95 **4.7 ms** | p95 < 300 ms |
| Checkout under load | 2 orders/s for 1 min through the saga | p95 **23.6 ms**, all accepted or 409 (sold out) | p95 < 800 ms |

## Documentation
- [Project plan](docs/plan.md) — requirements, architecture, data, Kafka, Kubernetes, AWS, phases
- [Coding conventions](CONTRIBUTING.md) — single-source declarations, classes + SOLID (backend), arrow functions + BEM (frontend)
- [Design system](docs/design-system.md) — "Saffron & Ink" tokens with contrast checks
- [Architecture decisions](docs/adr/):
  [0001 one repo](docs/adr/0001-one-repo-three-independent-projects.md) ·
  [0002 Next.js + SPA](docs/adr/0002-nextjs-site-and-react-spa-admin.md) ·
  [0003 gateway + services](docs/adr/0003-gateway-bff-and-database-per-service.md) ·
  [0004 MySQL / MongoDB](docs/adr/0004-mysql-and-mongodb-split.md) ·
  [0005 saga + outbox](docs/adr/0005-kafka-choreography-saga-and-outbox.md) ·
  [0006 idempotency, retry, DLQ](docs/adr/0006-idempotent-consumers-retry-and-dlq.md) ·
  [0007 Kubernetes](docs/adr/0007-kubernetes-kustomize-kind-strimzi.md) ·
  [0008 BEM + tokens](docs/adr/0008-bem-and-design-tokens.md) ·
  [0009 AWS as CDK](docs/adr/0009-aws-production-as-cdk-code.md) ·
  [0010 Atlas](docs/adr/0010-mongodb-atlas-on-aws.md) ·
  [0011 Prisma](docs/adr/0011-prisma-for-mysql-and-mongodb.md) ·
  [0012 bilingual + currency](docs/adr/0012-bilingual-content-and-currency-display.md)
- [Kubernetes staging](docs/k8s.md) · [AWS production](docs/aws.md) · [AWS cost](docs/aws-cost.md)
- [Runbook](docs/runbook.md) · [Resilience drills](docs/drills.md)
- [Database files](backend/db/README.md)
