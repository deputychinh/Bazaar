import { QueryClient } from '@tanstack/react-query';

/** Server state lives in TanStack Query (plan §6A.4); one client per app. */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      // Tests fail fast instead of waiting for the retry delay.
      queries: {
        staleTime: 30_000,
        retry: import.meta.env.MODE === 'test' ? false : 1,
        refetchOnWindowFocus: false,
      },
    },
  });
