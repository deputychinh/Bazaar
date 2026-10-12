import { QueryClient } from '@tanstack/react-query';

/** Server state lives in TanStack Query (plan §6A.4); one client per app. */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
