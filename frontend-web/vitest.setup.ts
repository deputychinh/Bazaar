import '@testing-library/jest-dom/vitest';

// `server-only` throws outside a React Server build; tests import server modules directly.
vi.mock('server-only', () => ({}));
