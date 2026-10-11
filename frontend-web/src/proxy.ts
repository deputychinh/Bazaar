import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

/** Adds the locale to every page URL (Next.js 16 "proxy", formerly middleware). */
export default createMiddleware(routing);

export const config = {
  // Skip API calls (rewritten to the gateway), Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
