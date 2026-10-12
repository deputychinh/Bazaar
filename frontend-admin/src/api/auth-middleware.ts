import type { Middleware } from 'openapi-fetch';

import { accessToken, refreshSession } from '@/features/auth/auth-store';

/** Copies of outgoing requests, so one can be sent again after a refresh (bodies are streams). */
const copies = new Map<string, Request>();

/**
 * The one 401 → refresh → retry path (plan §6A.4): adds the access token to every request; when
 * the token has expired, refreshes it once and repeats the request with the new one.
 */
export const authMiddleware: Middleware = {
  onRequest: ({ request, id }) => {
    const token = accessToken();
    if (token !== null) request.headers.set('authorization', `Bearer ${token}`);
    copies.set(id, request.clone());
    return request;
  },
  onResponse: async ({ response, id }) => {
    const copy = copies.get(id);
    copies.delete(id);
    if (response.status !== 401 || copy === undefined) return response;
    const refreshed = await refreshSession();
    if (refreshed.data === null) return response;
    copy.headers.set('authorization', `Bearer ${refreshed.data.accessToken}`);
    return fetch(copy);
  },
  onError: ({ id }) => {
    copies.delete(id);
  },
};
