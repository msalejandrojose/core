import { QueryClient } from '@tanstack/react-query';

// Defaults conservadores para todo el backoffice. Cada feature puede
// sobreescribirlos en su propia query si necesita comportamiento distinto.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 s antes de refetch en background
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
