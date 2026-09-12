import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api';

/** Cache lifetimes, named by how fast the underlying data actually moves. */
export const STALE_TIME = {
  /** Safety information. Alerts, river levels, road closures. */
  live: 60 * 1000,
  /** Readings that update hourly. Weather, air quality. */
  hourly: 15 * 60 * 1000,
  /** Statistical figures with a vintage measured in years. Census, migration, indicators. */
  reference: 24 * 60 * 60 * 1000,
} as const;

/**
 * How long an unused cache entry survives before it is dropped.
 *
 * A week, and deliberately far longer than any `staleTime`. On mobile the cache is also the
 * offline story: a reader who opens the app in a valley with no signal should still see the
 * district page they looked at yesterday, marked as stale, rather than an error. `gcTime`
 * is what decides whether that data is still there to show.
 */
export const CACHE_TIME = 7 * 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.hourly,
        gcTime: CACHE_TIME,
        /**
         * Retry only what retrying can fix.
         *
         * A 404 or a schema mismatch will fail identically three more times while the reader
         * watches a spinner. Connectivity failures are the ones worth another attempt.
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            return error.isRetryable && failureCount < 3;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
        /**
         * Refetch when the app returns to the foreground rather than on every screen focus.
         * Someone tabbing between Home and Alerts should not trigger a request per tap.
         */
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        /** Keep showing the previous page's data while the next one loads. */
        placeholderData: <T,>(previous: T) => previous,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
