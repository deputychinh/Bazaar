import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Default answers: an anonymous visitor (no session). Tests add their own handlers. */
export const server = setupServer(
  http.post('*/api/v1/auth/refresh', () =>
    HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'test', status: 401 }, { status: 401 }),
  ),
);
