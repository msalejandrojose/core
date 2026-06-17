// Singleton de TanStack Query para todo el backoffice.
// Defaults conservadores: 30s antes de refetch, retry una sola vez.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
