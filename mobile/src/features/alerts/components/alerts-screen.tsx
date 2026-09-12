import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Entrance, Text, VStack } from '@/components/atoms';
import { Chip, EmptyState, ErrorState, LoadingState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';

import { SEVERITY_RANK, type AlertType } from '../schemas';
import { useActiveAlerts } from '../hooks';
import { AlertCard } from './alert-card';

const TYPE_FILTERS: { label: string; value: AlertType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Weather', value: 'weather' },
  { label: 'River', value: 'river' },
  { label: 'Flood', value: 'flood' },
  { label: 'Road', value: 'road' },
  { label: 'Disaster', value: 'disaster' },
];

/**
 * Every alert in force, most severe first.
 *
 * Filtering happens on the client rather than by refetching per chip. The active set is
 * bounded and already in memory, so a round trip per tap would add latency and a spinner to
 * something that should feel instant — and would fail entirely when the reader is offline.
 */
export function AlertsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<AlertType | 'all'>('all');

  // One stable handler for every row, so AlertCard's memo actually holds.
  const openAlert = useCallback((id: number) => router.push(`/alerts/${id}`), [router]);

  const { data, isPending, isError, error, refetch, isRefetching } = useActiveAlerts();

  const alerts = useMemo(() => {
    const list = data ?? [];
    const filtered = type === 'all' ? list : list.filter((alert) => alert.type === type);
    return [...filtered].sort((a, b) => {
      const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (rank !== 0) return rank;
      // Same severity: newest first, so a fresh warning is never buried under an older one.
      return b.issuedAt.localeCompare(a.issuedAt);
    });
  }, [data, type]);

  const header = (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <VStack gap="sm" paddingY="sm">
        <VStack paddingX="lg">
          <Text variant="title">Alerts</Text>
          <Text variant="footnote" color="textMuted">
            {isPending ? 'Loading' : `${alerts.length} in force`}
          </Text>
        </VStack>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.xs,
          }}
        >
          {TYPE_FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              selected={type === filter.value}
              onPress={() => setType(filter.value)}
            />
          ))}
        </ScrollView>
      </VStack>
    </View>
  );

  if (isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Loading alerts" />
      </Screen>
    );
  }

  if (isError && data === undefined) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} header={header}>
      <FlatList
        data={alerts}
        keyExtractor={(alert) => String(alert.id)}
        renderItem={({ item, index }) => (
          <Entrance index={index}>
            <AlertCard alert={item} onPress={openAlert} />
          </Entrance>
        )}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl * 2,
          gap: theme.spacing.sm,
        }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <EmptyState
            title={type === 'all' ? 'No active alerts' : `No ${type} alerts`}
            message={
              type === 'all'
                ? 'Nothing is in force across Uttarakhand right now.'
                : 'Try another category, or pull down to refresh.'
            }
            icon="checkmark-circle-outline"
          />
        }
      />
    </Screen>
  );
}
