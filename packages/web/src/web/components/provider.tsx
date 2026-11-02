import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutumnProvider } from "autumn-js/react";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, e) => n < 1 && !/FORBIDDEN|UNAUTHORIZED|NOT_FOUND/i.test(String((e as { code?: string })?.code ?? "")), refetchOnWindowFocus: false } },
});

interface ProviderProps {
  children: React.ReactNode;
}

// App-level providers. QueryClientProvider must stay (all API calls run through TanStack Query).
// AutumnProvider backs card checkout for testing bookings (switched off until an admin sets a price).
export function Provider({ children }: ProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AutumnProvider useBetterAuth>{children}</AutumnProvider>
    </QueryClientProvider>
  );
}
