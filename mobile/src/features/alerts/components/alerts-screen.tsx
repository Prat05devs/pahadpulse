import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';

import { Card, Entrance, HStack, Icon, Text, VStack } from '@/components/atoms';
import {
  Chip,
  CivicHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT, type TranslationKey } from '@/i18n';
import { formatRelative } from '@/lib/format';
import { useTheme } from '@/theme';

import { isAlertInForce, SEVERITY_RANK, type AlertType } from '../schemas';
import { useActiveAlerts } from '../hooks';
import { AlertCard } from './alert-card';

const TYPE_FILTERS: { labelKey: TranslationKey; value: AlertType | 'all' }[] = [
  { labelKey: 'alertType.all', value: 'all' },
  { labelKey: 'alertType.weather', value: 'weather' },
  { labelKey: 'alertType.river', value: 'river' },
  { labelKey: 'alertType.flood', value: 'flood' },
  { labelKey: 'alertType.road', value: 'road' },
  { labelKey: 'alertType.disaster', value: 'disaster' },
];

/**
 * Every alert in force, most severe first.
 *
 * Filtering happens on the client rather than by refetching per chip. The active set is
 * bounded and already in memory, so a round trip per tap would add latency and a spinner to
 * something that should feel instant - and would fail entirely when the reader is offline.
 */
export function AlertsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const [type, setType] = useState<AlertType | 'all'>('all');

  // One stable handler for every row, so AlertCard's memo actually holds.
  const openAlert = useCallback((id: number) => router.push(`/alerts/${id}`), [router]);

  const { data, dataUpdatedAt, isPending, isError, error, refetch, isRefetching } =
    useActiveAlerts();

  const alerts = useMemo(() => {
    const list = (data ?? []).filter((alert) => isAlertInForce(alert));
    const filtered = type === 'all' ? list : list.filter((alert) => alert.type === type);
    return [...filtered].sort((a, b) => {
      const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (rank !== 0) return rank;
      // Same severity: newest first, so a fresh warning is never buried under an older one.
      return b.issuedAt.localeCompare(a.issuedAt);
    });
  }, [data, type]);

  const hasUrgentAlert = alerts.some(
    (alert) => alert.severity === 'severe' || alert.severity === 'extreme'
  );
  const feedLabel = isPending
    ? t('common.loading')
    : isError
      ? t('alerts.savedActive', { count: alerts.length })
      : t('alerts.inForce', { count: alerts.length });

  const header = (
    <CivicHeader
      title={t('nav.alerts')}
      eyebrow={feedLabel}
      subtitle={t('alerts.header.subtitle')}
      live={!isPending && !isError}
      urgent={hasUrgentAlert}
    >
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
            label={t(filter.labelKey)}
            selected={type === filter.value}
            onPress={() => setType(filter.value)}
          />
        ))}
      </ScrollView>
    </CivicHeader>
  );

  if (isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label={t('today.alerts.loading')} />
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
            <AlertCard alert={item} onPress={openAlert} featured={index === 0} />
          </Entrance>
        )}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl * 2,
          gap: theme.spacing.sm,
        }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <VStack gap="sm" style={{ marginBottom: theme.spacing.sm }}>
            <SectionHeader
              title={t('alerts.directives.title')}
              subtitle={t('alerts.directives.subtitle')}
            />
            {isError && data !== undefined ? (
              <Card tone="muted" elevation="none" accessibilityRole="alert">
                <HStack gap="sm" align="center">
                  <Icon name="cloud-offline-outline" size={20} tone="warning" />
                  <VStack grow gap="xxs">
                    <Text variant="bodyStrong">{t('alerts.savedTitle')}</Text>
                    <Text variant="caption" color="textMuted">
                      {dataUpdatedAt > 0
                        ? t('error.savedData.checked', {
                            when: formatRelative(new Date(dataUpdatedAt)),
                          })
                        : t('alerts.savedPullDown')}
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            ) : null}
          </VStack>
        }
        ListEmptyComponent={
          <EmptyState
            title={
              type === 'all'
                ? t('alerts.empty.all')
                : t('alerts.empty.filtered', { type: t(`alertType.${type}`) })
            }
            message={
              type === 'all' ? t('alerts.empty.allMessage') : t('alerts.empty.filteredMessage')
            }
            icon="checkmark-circle-outline"
          />
        }
        ListFooterComponent={
          <Card tone="primary" elevation="none" style={{ marginTop: theme.spacing.sm }}>
            <HStack gap="sm" align="flex-start">
              <Icon name="shield-checkmark-outline" tone="primary" />
              <VStack grow gap="xxs">
                <Text variant="bodyStrong">{t('alerts.provenance.title')}</Text>
                <Text variant="caption" color="textMuted">
                  {t('alerts.provenance.body')}
                </Text>
              </VStack>
            </HStack>
          </Card>
        }
      />
    </Screen>
  );
}
