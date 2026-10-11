# Bazaar — multi-vendor marketplace

A production-style fullstack project run entirely on a laptop: **React with three rendering modes
(SSG · SSR · SPA)**, **NestJS services talking over Kafka**, **MySQL + MongoDB + Redis**, shipped with
**Docker** and **Kubernetes** (kind), with the AWS production environment written in **CDK**.

> Status: **P0 Foundation done** · next: P1 Identity + gateway. Full plan: [`docs/plan.md`](docs/plan.md) ·
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
make help        # every command
```

| Local tool | URL |
|---|---|
| Kafka UI | http://localhost:8085 |
| Mailpit (emails) | http://localhost:8026 |
| Object storage console | http://localhost:9003 |

All ports are bound to `127.0.0.1`. Credentials in `.env.example` are for local use only.

## Documentation
- [Project plan](docs/plan.md) — requirements, architecture, data, Kafka, Kubernetes, AWS, phases
- [Coding conventions](CONTRIBUTING.md) — single-source declarations, classes + SOLID (backend), arrow functions + BEM (frontend)
- [Design system](docs/design-system.md) — "Saffron & Ink" tokens with contrast checks
- [Architecture decisions](docs/adr/)
- [Database files](backend/db/README.md)
