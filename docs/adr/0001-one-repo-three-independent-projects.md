# ADR 0001 — One repository, three independent projects

- Status: Accepted
- Date: 2026-10-11
- Decisions: D12, D13 (plan §4)

## Context
Bazaar has a NestJS backend (four services + shared packages), a Next.js customer site and a React SPA
admin site. The team wants the two frontends kept apart — not mixed in one workspace — while keeping one
place for plans, infrastructure and history.

## Decision
- One git repository with three projects that **share nothing at build time**:
  `backend/` (npm workspaces + Turborepo inside it), `frontend-web/`, `frontend-admin/`.
  Each has its own `package.json`, lockfile, Dockerfile and CI workflow filtered by path.
- The root `package.json` holds repo tooling only (Prettier, Husky, commitlint) — no workspaces.
- Frontends never import backend code. API types are **generated** from the gateway OpenAPI file
  (`backend/openapi/gateway.json`) with openapi-typescript; CI fails when generated types are stale.
- Each frontend owns a copy of the design tokens; `scripts/check-tokens.mjs` fails CI when they differ.

## Consequences
- Any project can be installed, tested, released or moved to its own repository (`git subtree split`) alone.
- "Write it once" still holds: enums and DTOs live in `backend/packages/contracts` and reach the
  frontends through OpenAPI; the token list lives in `docs/design-system.md`.
- Cost: an extra generation step and two small consistency checks in CI.
