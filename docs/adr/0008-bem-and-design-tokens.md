# ADR 0008 — BEM and design tokens, no CSS framework

- Status: Accepted
- Date: 2026-10-11
- Plan: §6A.6, `docs/design-system.md`, BZ-033, BZ-057

## Context
Two frontends must look like one product, meet WCAG 2.2 contrast, support a dark theme and stay fast
(the customer site inlines its few KB of CSS). Utility frameworks add a build dependency and spread
design decisions into markup.

## Decision
- **Design tokens** in CSS custom properties, two layers: primitives (colour scales, spacing, type) and
  semantic tokens (`--color-text`, `--color-surface`…); components use semantic tokens only; the dark
  theme swaps semantic values under `[data-theme='dark']`. `docs/design-system.md` is the source.
- **BEM** class names (`block__element--modifier`), one CSS file per component, Stylelint enforcing
  the naming and banning raw colour values.
- Each frontend keeps a copy of the tokens; `scripts/check-tokens.mjs` fails CI when they differ.

## Consequences
- No framework to upgrade; styles are explicit and searchable; the customer site's CSS stays small
  enough to inline (Lighthouse CI budgets).
- More CSS written by hand, and a naming discipline that reviews and Stylelint must keep.
