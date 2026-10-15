# ADR 0002 — Next.js for the customer site, a React SPA for the admin site

- Status: Accepted
- Date: 2026-10-11
- Plan: §2 (rendering modes), BZ-032..041, BZ-057..063

## Context
The customer site must be found by search engines and feel instant on mobile (NFR-01: LCP < 1.5 s);
product pages change when sellers edit them. The admin site (sellers, platform admins) sits behind a
login, is used for long sessions and needs no SEO.

## Decision
- **`frontend-web`: Next.js** (App Router) with all three rendering modes: **SSG** for landing and
  info pages, **ISR** for product pages (revalidated on `ProductUpdated` through `/api/revalidate`),
  **SSR** for search, category and account pages. `/en` and `/vi` routes.
- **`frontend-admin`: React SPA built with Vite**, React Router, TanStack Query; served as static files
  (nginx locally, S3 + CloudFront on AWS).
- Both call the API on their own origin (`/api` → gateway), keep the access token in memory and the
  refresh token in an HttpOnly first-party cookie.

## Consequences
- Each site uses the mode that fits it; the SPA has no server to run or scale.
- Two build pipelines and two sets of dependencies (accepted, see ADR 0001); design tokens are shared
  by copy and checked by `scripts/check-tokens.mjs`.
- ISR needs the revalidation hook and a shared secret; the web server needs a writable cache volume.

## Update (P11, BZ-092)
The home page left SSG when it became a marketplace home (best sellers, category tiles, daily
picks). Image builds have no gateway, so a prerendered home shipped without products until its first
revalidation. It now renders per request from a feed cached for 2 minutes (`unstable_cache`); a
failed refresh is never cached and the last good feed keeps being served. Info pages stay SSG.
