# ADR 0003 — Gateway/BFF plus three services, a database per service

- Status: Accepted
- Date: 2026-10-11
- Plan: §5, DS-02, BZ-012..031

## Context
The domain splits into identity, catalog, ordering and notifications with different data shapes and
load. The frontends should not know how the backend is cut, and each part should be changeable alone.

## Decision
- **gateway** (BFF + identity): the only public entry point — authentication (RS256 tokens, JWKS),
  roles, rate limits, request shaping for both frontends, checkout orchestration over HTTP.
- **catalog**, **order**, **notification**: independent NestJS services.
- **Database per service**: identity and orders in their own MySQL databases and users, catalog and
  notification in their own MongoDB databases. No service reads another's tables; data crosses
  boundaries only through APIs and Kafka events.
- Service-to-service HTTP routes are marked `@Internal()` and need `INTERNAL_API_KEY`; in Kubernetes
  a NetworkPolicy also lets only the gateway reach them.

## Consequences
- Services deploy and scale separately; a slow catalog does not block identity.
- Cross-service consistency is eventual (ADR 0005) and joins happen in the gateway or in read models
  (notification keeps its own contacts and order summaries).
- More moving parts locally — mitigated by compose, `make up-full` and kind.
