import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Помилки 4xx повторювати безглуздо: відповідь не зміниться.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: true,
    },
  },
});
