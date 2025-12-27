import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Standard caching strategy used in older TanStack Query versions (now defaults to 0).
        // 1 minute stale time avoids immediate refetches on window focus for fast interactions.
        staleTime: 60 * 1000, 
        retry: 1,
        refetchOnWindowFocus: false, // Cleaner UX for this specific app
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
