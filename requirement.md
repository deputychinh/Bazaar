# Bazaar — Requirement

## Original request (verbatim)

> TÔi cần 1 fullstack project có sử dụng reactjs static for landing page reactjs SSR và single page also tuỳ theo từng trạng
> BE tôi cần nest js và kafka database tôi cần mongodb và mysql tôi cần dùng cả docker và kubernate nữa
> xem tôi có cần cài cái này để dễ theo dõi `kind` (v0.33.0, darwin-arm64)
> đầu tiên tạo thư mục gốc và requirement tiếp đó là plan chúng ta tạo 1 plan hoàn chỉnh before coding

## Same standards as the earlier projects (b2b/requirement.txt, relay, real-estate)

- `docs/plan.md` first, approved before any code is written.
- One brand colour set for the whole project; all CSS written in BEM.
- Enums / interfaces / constants written in **one place** and imported; simple, obvious util names; simplicity first.
- draw.io diagrams: architecture, deployment, ERD, one sequence diagram per business flow.
- Production-grade quality, ready to show to clients.

## Stack requirements (structured)

| Area | Requirement |
|---|---|
| Frontend — static | React, statically generated landing / marketing pages (SSG) |
| Frontend — SSR | React, server-side rendered pages where SEO + fresh data matter |
| Frontend — SPA | React, client-only single-page app for logged-in, highly interactive screens |
| Rendering rule | Pick the rendering mode **per page, by its state** (public & static → SSG, public & dynamic → SSR, private & interactive → SPA) |
| Backend | NestJS (TypeScript) |
| Messaging | Apache Kafka (event-driven communication between services) |
| Databases | MongoDB **and** MySQL — each used where it fits best |
| Containers | Docker (Dockerfile per app, docker compose for local dev) |
| Orchestration | Kubernetes (local cluster with `kind`, manifests ready for a real cluster) |
| Cache | **Redis** — required (added 2026-10-11) |
| Language / currency | UI, emails and product content in **English and Vietnamese**; all money stored in **USD** in the backend, VND for display only (added 2026-10-11) |
| Data files | Schema and seed data in `db/` as `schema.sql` / `data.sql` (MongoDB: `schema.js` / `data.js`) (added 2026-10-11) |
| Code language | English |
| Cloud | AWS deployment written as code with **AWS CDK** (added 2026-10-10: "Thiếu phần triển khai aws bằng cdk code nữa") |

## Machine (checked 2026-10-10)

| Tool | Status |
|---|---|
| macOS arm64 | yes |
| Node | v26.10.0 |
| npm | installed |
| Docker | 29.8.1 |
| kind / kubectl / helm / k9s | **not installed** — see `docs/plan.md` §12 |
