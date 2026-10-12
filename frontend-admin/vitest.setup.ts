import '@testing-library/jest-dom/vitest';

import { server } from '@/test-utils/msw-server';

// MSW answers API calls in tests; any request without a handler fails the test (plan §6A.4).
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Every test starts with a fresh, signed-out session store.
afterEach(async () => {
  const { resetAuthStore } = await import('@/features/auth/auth-store');
  const { signOutEverywhere } = await import('@/test-utils/session');
  resetAuthStore();
  signOutEverywhere();
  window.localStorage.clear();
});
