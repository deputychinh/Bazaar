# Bazaar Design System — "Saffron & Ink"

Source of truth for both frontends (`frontend-web`, `frontend-admin`). Each copies these tokens into
`src/styles/tokens/*.css`; `scripts/check-tokens.mjs` fails CI if the two copies differ from each other.
Rules for writing CSS: plan §6A.6. Contrast ratios below were computed with the WCAG 2.2 formula.

## 1. Principles
- **Warm and trustworthy**: saffron for action, warm neutrals ("ink") for everything else.
- **Two layers of tokens**: primitives (raw scales) → semantic tokens (meaning). Components use **semantic tokens only**.
- **Accessible by default**: body text ≥ 7:1, interactive text ≥ 4.5:1, control borders and focus ≥ 3:1.
- **Same tokens, two themes**: dark theme swaps semantic values under `[data-theme='dark']`.

## 2. Colour — primitives (`tokens/colors.css`)
| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| `--color-saffron-*` (brand) | #FFF4ED | #FFE6D5 | #FECCAA | #FDAC74 | #FB8A3C | #E8590C | #C2410C | #9A3412 | #7C2D12 | #431407 |
| `--color-ink-*` (neutral) | #FAFAF9 | #F5F5F4 | #E7E5E4 | #D6D3D1 | #A8A29E | #78716C | #57534E | #44403C | #292524 | #1C1917 |
| `--color-teal-*` (success) | #F0FDFA | #CCFBF1 | #99F6E4 | #5EEAD4 | #2DD4BF | #14B8A6 | #0F766E | #115E59 | #134E4A | #042F2E |
| `--color-amber-*` (warning) | #FFFBEB | #FEF3C7 | #FDE68A | #FCD34D | #FBBF24 | #F59E0B | #D97706 | #B45309 | #92400E | #451A03 |
| `--color-red-*` (danger) | #FEF2F2 | #FEE2E2 | #FECACA | #FCA5A5 | #F87171 | #EF4444 | #DC2626 | #B91C1C | #991B1B | #450A0A |
| `--color-blue-*` (info) | #EFF6FF | #DBEAFE | #BFDBFE | #93C5FD | #60A5FA | #3B82F6 | #2563EB | #1D4ED8 | #1E40AF | #172554 |

## 3. Colour — semantic
| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | ink-50 | ink-900 | Page background |
| `--color-surface` | #FFFFFF | ink-800 | Cards, panels, inputs |
| `--color-surface-raised` | #FFFFFF | ink-700 | Popovers, menus (with shadow) |
| `--color-text` | ink-900 | ink-50 | Body text |
| `--color-text-muted` | ink-600 | ink-400 | Secondary text |
| `--color-text-inverse` | #FFFFFF | ink-900 | Text on primary |
| `--color-border` | ink-200 | ink-700 | **Decorative** dividers only |
| `--color-border-control` | ink-500 | ink-500 | Input, select, checkbox borders (≥ 3:1) |
| `--color-primary` | saffron-600 | saffron-400 | Primary buttons, links |
| `--color-primary-hover` | saffron-700 | saffron-300 | Hover / pressed |
| `--color-primary-subtle` | saffron-50 | saffron-900 | Selected rows, highlights |
| `--color-on-primary-subtle` | saffron-700 | saffron-200 | Text on `primary-subtle` |
| `--color-success` / `-subtle` / `--color-on-success-subtle` | teal-600 / teal-50 / teal-700 | teal-400 / teal-900 / teal-200 | Status: success |
| `--color-warning` / `-subtle` / `--color-on-warning-subtle` | amber-700 / amber-50 / amber-800 | amber-400 / amber-900 / amber-200 | Status: warning |
| `--color-danger` / `-subtle` / `--color-on-danger-subtle` | red-600 / red-50 / red-700 | red-400 / red-900 / red-200 | Status: error, destructive |
| `--color-info` / `-subtle` / `--color-on-info-subtle` | blue-600 / blue-50 / blue-700 | blue-400 / blue-900 / blue-200 | Status: info |
| `--color-focus-ring` | saffron-500 | saffron-400 | 2 px focus outline + 2 px offset |

### Contrast check (light theme unless noted)
| Pair | Ratio | Level |
|---|---|---|
| text ink-900 on bg ink-50 | 16.74 | AAA |
| text-muted ink-600 on white | 7.63 | AAA |
| white on primary saffron-600 | 5.18 | AA |
| white on primary-hover saffron-700 | 7.31 | AAA |
| link saffron-600 on white | 5.18 | AA |
| saffron-500 on white | 3.58 | Large text / icons only — never body text |
| success teal-600 · warning amber-700 · danger red-600 · info blue-600 on white | 5.47 · 5.02 · 4.83 · 5.17 | AA |
| badge text 700/800 on its 50 background (saffron, teal, amber, red, blue) | 6.76 · 7.27 · 6.84 · 5.91 · 6.16 | AA–AAA |
| control border ink-500 on white | 4.80 | ≥ 3:1 ✔ |
| decorative border ink-300 on white | 1.49 | Not for controls |
| dark: ink-50 on ink-900 · ink-400 on ink-900 · saffron-400 on ink-900 | 16.74 · 6.93 · 7.33 | AAA · AA · AAA |
| dark: control border ink-500 on ink-900 | 3.65 | ≥ 3:1 ✔ |

## 4. Spacing & padding (`tokens/spacing.css`) — 4 px base
| `--space-0` | `-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-8` | `-10` | `-12` | `-16` | `-20` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 4px | 8px | 12px | 16px | 20px | 24px | 32px | 40px | 48px | 64px | 80px |

| Semantic token | Value |
|---|---|
| `--padding-control` | `var(--space-2) var(--space-4)` |
| `--padding-control-sm` / `--padding-control-lg` | `var(--space-1) var(--space-3)` / `var(--space-3) var(--space-6)` |
| `--padding-card` | `var(--space-4)` → `var(--space-6)` from `--bp-md` |
| `--padding-section` | `var(--space-10) 0` → `var(--space-16) 0` from `--bp-md` |
| `--padding-page-x` | `var(--space-4)` → `var(--space-6)` (md) → `var(--space-8)` (lg) |
| `--gap-stack` / `--gap-inline` / `--gap-grid` | `var(--space-4)` / `var(--space-2)` / `var(--space-6)` |

Minimum touch target: 44 × 44 px — controls use `min-block-size: var(--size-touch-target)`.

## 5. Typography (`tokens/typography.css`)
| Token | Value |
|---|---|
| `--font-sans` | `'Inter Variable', 'Inter Variable Fallback', system-ui, sans-serif` — UI and body (supports Vietnamese diacritics) |
| `--font-display` | `'Fraunces Variable', 'Fraunces Variable Fallback', Georgia, serif` — headings on the customer site only |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` — SKUs, ids |
| Sizes | `--text-xs 12px` · `--text-sm 14px` · `--text-md 16px` · `--text-lg 18px` · `--text-xl 20px` · `--text-2xl 24px` · `--text-3xl 30px` · `--text-4xl 36px` · `--text-5xl 48px` |
| Weights | `--weight-regular 400` · `--weight-medium 500` · `--weight-semibold 600` · `--weight-bold 700` |
| Line heights | `--leading-tight 1.2` (headings) · `--leading-normal 1.5` (UI) · `--leading-relaxed 1.7` (long text, Vietnamese) |

Body text is never smaller than `--text-sm`; prices use `font-variant-numeric: tabular-nums`.
The `* Fallback` families are metric-matched local fonts declared in `styles/base/fonts.css` (no layout shift on font swap).

## 6. Shape, depth, layers, motion, layout
| Group | Tokens |
|---|---|
| Radius | `--radius-sm 4px` · `--radius-md 8px` (controls) · `--radius-lg 12px` (cards) · `--radius-xl 16px` (modals) · `--radius-full 9999px` (pills, avatars) |
| Shadow | `--shadow-sm 0 1px 2px rgb(28 25 23 / 6%)` · `--shadow-md 0 4px 12px rgb(28 25 23 / 8%)` · `--shadow-lg 0 12px 32px rgb(28 25 23 / 12%)` |
| Z-index | `--z-base 0` · `--z-dropdown 100` · `--z-sticky 200` · `--z-overlay 300` · `--z-modal 400` · `--z-toast 500` |
| Breakpoints (custom media) | `--bp-sm (min-width: 640px)` · `--bp-md (min-width: 768px)` · `--bp-lg (min-width: 1024px)` · `--bp-xl (min-width: 1280px)` |
| Layout | `--container-max 1200px` · `--container-narrow 720px` · `--header-height 64px` · `--sidebar-width 248px` (admin) · `--size-touch-target 44px` |
| Motion | `--duration-fast 120ms` · `--duration-normal 200ms` · `--duration-slow 320ms` · `--ease-standard cubic-bezier(0.2, 0, 0, 1)`; all transitions disabled under `prefers-reduced-motion: reduce` |

## 7. CSS patterns (summary of plan §6A.6)
```
styles/
├── tokens/   colors.css · spacing.css · typography.css · radius.css · shadow.css · z-index.css · breakpoints.css · motion.css · layout.css
├── base/     reset.css · base.css · a11y.css
├── layout/   container.css · stack.css · cluster.css · grid.css · sidebar.css
└── index.css (tokens → base → layout)
```
- **BEM**: block = component (`.product-card`), element (`.product-card__title`), modifier (`.product-card--featured`), state (`.is-open`, `.has-error`).
- **Layout primitives own the spacing between things**: `.stack` (vertical gap), `.cluster` (wrapping row), `.grid` (auto-fit columns), `.container` (max width + page padding). Components never set outer margins.
- **Tokens only** — raw colours, sizes, radii, shadows, z-indexes or durations fail Stylelint.
- Mobile-first; grow with `@media (--bp-md)`.
- No IDs, no `!important`, nesting ≤ 1, a block never styles another block's elements.

### Example
```css
/* components/Button/Button.css */
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-inline);
  min-block-size: 44px;
  padding: var(--padding-control);
  font: var(--weight-semibold) var(--text-md) / var(--leading-normal) var(--font-sans);
  color: var(--color-text-inverse);
  background: var(--color-primary);
  border: 0;
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.button:hover { background: var(--color-primary-hover); }
.button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.button--secondary { color: var(--color-primary); background: var(--color-primary-subtle); }
.button--danger { background: var(--color-danger); }
.button__icon { inline-size: 1.25em; block-size: 1.25em; }
```

## 8. Components inventory (built in P3 / P6)
Button · IconButton · Input · Textarea · Select · Checkbox · Radio · Switch · Badge (status tones) · Card · Modal · Drawer · Toast · Tabs · Table (sortable, paginated) · Pagination · Skeleton · EmptyState · ErrorState · Price (USD / VND) · LocaleSwitcher · CurrencySwitcher · ProductCard · RatingStars · OrderStatusBadge.
