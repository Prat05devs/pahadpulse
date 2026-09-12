import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

/**
 * Render with the providers a component actually needs.
 *
 * Retries are off and `gcTime` is zero so a failing query resolves immediately and nothing
 * leaks between tests — the default retry policy would otherwise make every error-path test
 * wait through three backoffs.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * ASYNC, because Testing Library v14's `render` is. Awaiting it is what populates the
 * returned queries and the global `screen` — a forgotten `await` yields an object with no
 * query methods on it at all, which is a confusing way to find out.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider
        // The provider measures real insets, which never arrive in a test environment.
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  /**
   * The queries are returned rather than read off the global `screen`, so a test states
   * which render it is asserting against. That matters as soon as one test renders twice.
   */
  return { queryClient, ...(await render(ui, { wrapper: Wrapper, ...options })) };
}

export * from '@testing-library/react-native';
