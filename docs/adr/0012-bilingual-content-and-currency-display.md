# ADR 0012 — Bilingual content and USD/VND display

- Status: Accepted
- Date: 2026-10-11
- Decisions: D17, plan §2B

## Context
The customer site is English and Vietnamese, and shows prices in USD or VND, while every amount is
stored and charged in USD cents. Product pages are server-rendered and cached (ISR), so their HTML is
shared by all visitors.

## Decision — language
- The locale is in the URL: `/en/...`, `/vi/...` (next-intl). `/` redirects using the saved cookie,
  then `Accept-Language`, then English. Slugs are the same in both languages.
- UI text lives in `frontend-web/messages/{en,vi}.json`, typed keys; a test fails when the two files
  do not have exactly the same keys.
- Content from the API arrives as `{ en, vi }`; the page picks the current locale and falls back to `en`.
- Backend errors are shown by translating their `code` (`errors.<CODE>`), never the server message.
- Every page has `<html lang>`, `hreflang` alternates and translated metadata.

## Decision — currency
- Gateway `currency` module: `GET /api/v1/fx-rates` → `{ base: "USD", rates: { VND }, fetchedAt, source }`.
  An `FxRateProvider` port has an HTTP adapter (a free rates API that includes VND) and a static adapter
  (fixed rate from config: offline development and tests). Rates are cached in Redis for 1 hour; when the
  provider fails, the last good value is served.
- The default display currency follows the locale (`vi` → VND, `en` → USD); a header switch stores the
  choice in a cookie.
- `<Price usdCents>` formats USD as `$12.50` and VND as `≈ 315.000 ₫` (whole đồng, `≈` = indicative).
- Sums (cart, order) are added in USD cents first, then converted once — never by adding rounded VND.
- Checkout always states the charged USD amount; JSON-LD offers use USD.
- Cached pages render the locale's default currency on the server; if the visitor chose another
  currency, the client re-renders prices after hydration (one possible flicker, pages stay cacheable).

## Consequences
- Pages stay statically cacheable per locale; no per-user HTML.
- VND figures are approximate by design and labelled so.
- A second locale needs only a messages file and an enum value.
