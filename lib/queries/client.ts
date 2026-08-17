import { QueryClient } from '@tanstack/react-query';

import { HttpError } from '@/lib/api/http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // Must be >= the persister's maxAge, or restored entries are evicted
      // immediately after being rehydrated.
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => {
        // A 4xx will fail identically on retry — a bad id stays a bad id.
        if (error instanceof HttpError && error.isClientError) return false;
        return failureCount < 2;
      },
      // Default is true on web; on native it fires on every app foreground,
      // which re-requests everything each time the user switches apps.
      refetchOnWindowFocus: false,
    },
  },
});
