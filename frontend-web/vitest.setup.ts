import '@testing-library/jest-dom/vitest';
import { createElement, type ImgHTMLAttributes, type ReactNode } from 'react';

// `server-only` throws outside a React Server build; tests import server modules directly.
vi.mock('server-only', () => ({}));

// next/image needs the Next.js image config; a plain <img> is enough for component tests.
vi.mock('next/image', () => ({
  default: ({
    fill,
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) =>
    createElement('img', { ...props, 'data-fill': fill, 'data-priority': priority }),
}));

// Locale-aware navigation needs the Next.js router; tests check hrefs instead.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement('a', { href, ...props }, children),
  usePathname: () => '/p/non-la',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
