import type { ReactNode } from 'react';

import { Card, HStack, Icon, Text, VStack } from '@/components/atoms';
import { formatRelative } from '@/lib/format';

import { EmptyState, ErrorState, LoadingState } from './states';

type QueryLike<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  dataUpdatedAt?: number;
};

type QueryBoundaryProps<T> = {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
  /** Replaces the default spinner — pass a skeleton shaped like the real content. */
  loading?: ReactNode;
  /** Called with the data to decide whether it counts as empty. */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
};

/**
 * Renders the right one of the four states for a TanStack Query result.
 *
 * Without it, every screen re-implements the same `isPending ? ... : isError ? ...` ladder
 * and they drift — one shows a spinner, the next a blank box, a third swallows the error.
 * This is the single place the ladder is written.
 *
 * Note it checks `isError` BEFORE `data`: with a persisted cache a query can hold yesterday's
 * data and still be failing to refresh, and quietly showing stale data as if it were current
 * is the failure mode this whole app exists to avoid.
 */
export function QueryBoundary<T>({
  query,
  children,
  loading,
  isEmpty,
  emptyTitle = 'Nothing to show',
  emptyMessage,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return <>{loading ?? <LoadingState />}</>;
  }

  if (query.isError && query.data === undefined) {
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }

  if (query.data === undefined) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  if (isEmpty?.(query.data)) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <>
      {query.isError ? (
        <Card tone="muted" elevation="none" accessibilityRole="alert">
          <HStack gap="sm" align="center">
            <Icon name="cloud-offline-outline" size={20} tone="warning" />
            <VStack grow gap="xxs">
              <Text variant="bodyStrong">Showing saved data</Text>
              <Text variant="caption" color="textMuted">
                {query.dataUpdatedAt
                  ? `Could not refresh · last checked ${formatRelative(new Date(query.dataUpdatedAt))}`
                  : 'Could not refresh. Try again when you have a connection.'}
              </Text>
            </VStack>
          </HStack>
        </Card>
      ) : null}
      {children(query.data)}
    </>
  );
}
