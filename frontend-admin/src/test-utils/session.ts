import { http, HttpResponse } from 'msw';

import type { Session } from '@/interfaces/auth.interface';

import { server } from './msw-server';

export const sessionFor = (
  role: 'SELLER' | 'ADMIN' | 'SHOPPER',
  accessToken = `token-${role}`,
): Session => ({
  accessToken,
  expiresIn: 900,
  user: {
    id: `${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@bazaar.test`,
    role: role as Session['user']['role'],
    status: 'ACTIVE' as Session['user']['status'],
    preferredLocale: 'en' as Session['user']['preferredLocale'],
    createdAt: '2026-10-01T00:00:00.000Z',
  },
});

/** A returning user: the session hint cookie is set and the silent refresh succeeds. */
export const signedInAs = (role: 'SELLER' | 'ADMIN' | 'SHOPPER'): void => {
  document.cookie = 'bazaar_session=1; path=/';
  server.use(http.post('*/api/v1/auth/refresh', () => HttpResponse.json(sessionFor(role))));
};

export const signOutEverywhere = (): void => {
  document.cookie = 'bazaar_session=; path=/; max-age=0';
};
