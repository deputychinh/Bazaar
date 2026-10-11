# Contributing to Bazaar

## Workflow
1. Pick a ticket from `docs/backlog.md` (`BZ-xxx`); it must have acceptance criteria (Definition of Ready).
2. Work on `main` in small steps; run `make ci` (lint, typecheck, unit tests, build) and, when you touched
   a database or Kafka, `make up && make test-int`.
3. Commit once the ticket is done — **one Conventional Commit per ticket**, scope from
   `commitlint.config.mjs`, ticket id at the end of the subject:
   `feat(order): split orders per seller [BZ-041]`. Husky runs Prettier (pre-commit) and commitlint (commit-msg).
4. Update docs/ADRs in the same commit when behaviour or a decision changes, then tick the ticket in the backlog.

**Definition of Done:** code + tests (unit; integration when DB/Kafka is touched), lint and typecheck green,
coverage thresholds met, docs/ADR updated, works on staging (kind) from P7.

## Coding conventions & patterns

Rules every project follows. Enforced by lint where possible (see *Enforcement*); the rest is checked in review. Source: `docs/plan.md` §6A — change both together.

**Four principles:** (1) **single source** — every enum, constant and interface is declared in exactly one file of its kind and imported everywhere else; (2) **independent units** — each module/feature/component depends only on abstractions and its own folder, so it can be moved, tested or replaced alone; (3) **backend = classes + SOLID**; (4) **frontend = arrow functions + design tokens + BEM**.

### 1 Single-source declarations (all projects)
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

### 2 Shared conventions (all projects)
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

### 3 Backend — classes, SOLID and patterns
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

### 4 Frontend — arrow functions, structure, patterns (both sites)
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

### 5 Design tokens — the full list (source: `docs/design-system.md`)
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
| `--color-border` / `--color-border-control` | ink-200 / ink-500 | Decorative dividers / input borders (ink-500 = 4.8:1, meets WCAG 1.4.11; ink-300 failed at 1.49:1) |
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

### 6 CSS patterns (BEM)
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

### 7 Example — the same feature, both sides
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

### 8 Enforcement
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
