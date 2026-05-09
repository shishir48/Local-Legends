import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,    // 30s — feel fresh, avoid spam refetches
      gcTime: 5 * 60 * 1000,   // 5 min in cache after unmount
      retry: 1,
      refetchOnWindowFocus: false, // RN ignores window focus anyway
    },
    mutations: {
      retry: 0,
    },
  },
});
