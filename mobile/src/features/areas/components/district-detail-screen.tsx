import { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';

import { Badge, Card, Divider, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import {
  EmptyState,
  ListRow,
  LoadingState,
  QueryBoundary,
  SectionHeader,
  SourceNote,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { AlertCard, useAreaAlerts } from '@/features/alerts';
import { useGroupedAreaIndicators } from '@/features/indicators';
import { WeatherPanel, useAreaWeather } from '@/features/weather';
import { formatNumber, humanise, localise } from '@/lib/format';
import { useIsDistrictSaved, useLanguage, usePreferencesStore } from '@/stores';
import { useTheme } from '@/theme';

import { useDistrictDetail } from '../hooks';

/**
 * One district, assembled from four independent queries.
 *
 * They are deliberately NOT combined into a single request. Each block renders as soon as
 * its own data lands and fails on its own if the source is down, so a broken weather feed
 * costs the reader the weather panel and nothing else. That is the same degradation promise
 * the portal makes everywhere: older data, clearly labelled, never a blank page.
 */
export function DistrictDetailScreen({ slug }: { slug: string }) {
  const theme = useTheme();
  const router = useRouter();
  // Stable across renders so AlertCard's memo holds.
  const openAlert = useCallback((id: number) => router.push(`/alerts/${id}`), [router]);
  const language = useLanguage();

  const detail = useDistrictDetail(slug);
  const weather = useAreaWeather(slug);
  const alerts = useAreaAlerts(slug);
  const indicators = useGroupedAreaIndicators(slug);

  const isSaved = useIsDistrictSaved(slug);
  const toggleSaved = usePreferencesStore((s) => s.toggleSavedDistrict);

  const district = detail.data?.district;
  const name = district ? localise(district.name, language) : humanise(slug);

  const refreshAll = () => {
    void detail.refetch();
    void weather.refetch();
    void alerts.refetch();
    void indicators.refetch();
  };

  return (
    <Screen
      onRefresh={refreshAll}
      refreshing={detail.isRefetching || weather.isRefetching || alerts.isRefetching}
    >
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <Pressable
              onPress={() => toggleSaved(slug)}
              haptic
              accessibilityLabel={isSaved ? `Unfollow ${name}` : `Follow ${name}`}
              accessibilityState={{ selected: isSaved }}
              style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved ? theme.colors.primary : theme.colors.textMuted}
              />
            </Pressable>
          ),
        }}
      />

      {/* Identity */}
      <QueryBoundary query={detail} loading={<LoadingState label={`Loading ${name}`} />}>
        {(data) => (
          <Card>
            <VStack gap="sm">
              <Text variant="title">{localise(data.district.name, language)}</Text>
              <HStack gap="xs" wrap>
                {data.district.division ? (
                  <Badge label={`${data.district.division} division`} tone="primary" />
                ) : null}
                {data.district.headquarters ? (
                  <Badge
                    label={`HQ ${localise(data.district.headquarters, language)}`}
                    tone="neutral"
                  />
                ) : null}
                {data.boundary ? null : <Badge label="No map boundary" tone="warning" />}
              </HStack>
              <Divider spacing="xs" />
              <HStack gap="xl">
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    TEHSILS
                  </Text>
                  <Text variant="bodyStrong" tabular>
                    {formatNumber(data.tehsils.length)}
                  </Text>
                </VStack>
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    LGD CODE
                  </Text>
                  <Text variant="bodyStrong" tabular>
                    {data.district.officialIds.lgd ?? '—'}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Card>
        )}
      </QueryBoundary>

      {/* Weather. Absent rather than errored when the district has no station. */}
      {weather.data || weather.isPending ? (
        <VStack gap="sm">
          <SectionHeader title="Weather" subtitle="Nearest observation station" />
          <QueryBoundary query={weather} loading={<LoadingState label="Loading weather" />}>
            {(data) => <WeatherPanel weather={data} />}
          </QueryBoundary>
        </VStack>
      ) : null}

      {/* Alerts */}
      <VStack gap="sm">
        <SectionHeader
          title="Active alerts"
          subtitle={`Warnings in force for ${name}`}
          onPressAction={() => router.push('/alerts')}
        />
        <QueryBoundary
          query={alerts}
          loading={<LoadingState label="Loading alerts" />}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No active alerts"
          emptyMessage="No warnings are in force for this district right now."
        >
          {(list) => (
            <VStack gap="sm">
              {list.slice(0, 3).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onPress={openAlert}
                />
              ))}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>

      {/* Statistics */}
      <VStack gap="sm">
        <SectionHeader title="Statistics" subtitle="Every figure carries its source" />
        <QueryBoundary
          query={indicators}
          loading={<LoadingState label="Loading statistics" />}
          isEmpty={() => indicators.groups.length === 0}
          emptyTitle="No published figures"
          emptyMessage="Nothing has been published for this district yet."
        >
          {() => (
            <VStack gap="md">
              {indicators.groups.map((group) => (
                <Card key={group.category} padding="md">
                  <VStack>
                    <Text variant="footnote" color="textMuted">
                      {group.category.toUpperCase()}
                    </Text>
                    {group.values.map((value, index) => (
                      <VStack key={value.indicator.key}>
                        {index > 0 ? <Divider /> : null}
                        <ListRow
                          title={localise(value.indicator.label, language)}
                          value={formatNumber(value.value, value.indicator.decimals)}
                          subtitle={value.indicator.unit}
                          showChevron={false}
                        />
                        <VStack style={{ paddingBottom: theme.spacing.sm }}>
                          <SourceNote provenance={value.provenance} compact />
                        </VStack>
                      </VStack>
                    ))}
                  </VStack>
                </Card>
              ))}

              {indicators.pending.length > 0 ? (
                <Card padding="md" tone="muted" elevation="none">
                  <VStack gap="xs">
                    <Text variant="footnote" color="textMuted">
                      STILL BEING COMPILED
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {indicators.pending
                        .map((indicator) => localise(indicator.label, language))
                        .join(', ')}
                    </Text>
                  </VStack>
                </Card>
              ) : null}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>

      {/* Tehsils */}
      <QueryBoundary query={detail} loading={<></>}>
        {(data) =>
          data.tehsils.length === 0 ? (
            <EmptyState title="No tehsils recorded" />
          ) : (
            <VStack gap="sm">
              <SectionHeader title="Tehsils" subtitle={`${data.tehsils.length} in this district`} />
              <Card padding="md">
                {data.tehsils.map((tehsil, index) => (
                  <VStack key={tehsil.slug}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow
                      title={localise(tehsil.name, language)}
                      subtitle={
                        tehsil.villages.length > 0
                          ? `${formatNumber(tehsil.villages.length)} villages`
                          : undefined
                      }
                      showChevron={false}
                    />
                  </VStack>
                ))}
              </Card>
            </VStack>
          )
        }
      </QueryBoundary>
    </Screen>
  );
}
