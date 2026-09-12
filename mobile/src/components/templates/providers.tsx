import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { subscribeToAppFocus } from '@/lib/app-focus';
import { CACHE_TIME, createQueryClient } from '@/lib/query-client';
import { STORAGE_KEYS } from '@/lib/storage';
import { ThemeProvider } from '@/theme';

/**
 * Every app-wide provider, in one place and in the order they depend on each other.
 *
 * `ThemeProvider` sits inside the query provider because it reads the reader's theme choice
 * from Zustand, which has no provider of its own — a Zustand store is just a module.
 */

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEYS.queryCache,
  /**
   * Throttled so a burst of successful queries writes once rather than once each. Serialising
   * the whole cache is the most expensive thing this app does on the JS thread.
   */
  throttleTime: 2_000,
});

export function AppProviders({ children }: { children: ReactNode }) {
  /**
   * Created in state, not at module scope.
   *
   * A module-level client survives Fast Refresh with stale data attached, and in tests it
   * leaks cache between cases. One client per mount is the behaviour we actually want.
   */
  const [queryClient] = useState(createQueryClient);

  /*
   * Foreground/background has to be reported to TanStack Query explicitly on React Native.
   * Mounted once here, at the root, rather than per screen: focus is an app-wide fact.
   */
  useEffect(subscribeToAppFocus, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_TIME,
        /**
         * Bumping this string discards every persisted response.
         *
         * Change it whenever a schema changes shape: a cache written by the previous version
         * would otherwise be replayed into a parser that now rejects it, and the reader sees
         * errors on a screen that worked yesterday until they clear app data.
         */
        buster: 'v1',
        dehydrateOptions: {
          /**
           * Only successful queries are worth persisting. Writing errors to disk means an
           * outage that happened once is replayed on every cold start until it expires.
           */
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <SafeAreaProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
