import '@testing-library/jest-dom/vitest';

import { server } from '@/test-utils/msw-server';

// MSW answers API calls in tests; any request without a handler fails the test (plan §6A.4).
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
