import { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';

import {
  Badge,
  Card,
  Divider,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from '@/components/atoms';
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
import { useAreaNetwork } from '@/features/connectivity';
import { useT } from '@/i18n';
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
  const t = useT();

  const detail = useDistrictDetail(slug);
  const weather = useAreaWeather(slug);
  const alerts = useAreaAlerts(slug);
  const indicators = useGroupedAreaIndicators(slug);
  const connectivity = useAreaNetwork(slug);

  const isSaved = useIsDistrictSaved(slug);
  const toggleSaved = usePreferencesStore((s) => s.toggleSavedDistrict);

  const district = detail.data?.district;
  const name = district ? localise(district.name, language) : humanise(slug);

  const refreshAll = () => {
    void detail.refetch();
    void weather.refetch();
    void alerts.refetch();
    void indicators.refetch();
    void connectivity.refetch();
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
              accessibilityLabel={
                isSaved ? t('districts.unfollow', { name }) : t('districts.follow', { name })
              }
              accessibilityState={{ selected: isSaved }}
              style={{
                minHeight: 48,
                minWidth: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
      <QueryBoundary
        query={detail}
        loading={<LoadingState label={t('districtDetail.loading', { name })} />}
      >
        {(data) => (
          <Card>
            <VStack gap="sm">
              <Text variant="title">{localise(data.district.name, language)}</Text>
              <HStack gap="xs" wrap>
                {data.district.division ? (
                  <Badge
                    label={t('districts.division', { division: data.district.division })}
                    tone="primary"
                  />
                ) : null}
                {data.district.headquarters ? (
                  <Badge
                    label={t('districtDetail.hq', {
                      name: localise(data.district.headquarters, language),
                    })}
                    tone="neutral"
                  />
                ) : null}
                {data.boundary ? null : (
                  <Badge label={t('districtDetail.noBoundary')} tone="warning" />
                )}
              </HStack>
              <Divider spacing="xs" />
              <HStack gap="xl">
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    {t('districtDetail.tehsilsUpper')}
                  </Text>
                  <Text variant="bodyStrong" tabular>
                    {formatNumber(data.tehsils.length)}
                  </Text>
                </VStack>
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    {t('districtDetail.lgdCode')}
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
          <SectionHeader
            title={t('districtDetail.weather')}
            subtitle={t('districtDetail.weather.subtitle')}
          />
          <QueryBoundary
            query={weather}
            loading={<LoadingState label={t('districtDetail.weather.loading')} />}
          >
            {(data) => <WeatherPanel weather={data} />}
          </QueryBoundary>
        </VStack>
      ) : null}

      {/* Alerts */}
      <VStack gap="sm">
        <SectionHeader
          title={t('today.activeAlerts')}
          subtitle={t('districtDetail.alerts.subtitle', { name })}
          onPressAction={() => router.push('/alerts')}
        />
        <QueryBoundary
          query={alerts}
          loading={<LoadingState label={t('today.alerts.loading')} />}
          isEmpty={(list) => list.length === 0}
          emptyTitle={t('alerts.empty.all')}
          emptyMessage={t('districtDetail.alerts.empty')}
        >
          {(list) => (
            <VStack gap="sm">
              {list.slice(0, 3).map((alert) => (
                <AlertCard key={alert.id} alert={alert} onPress={openAlert} />
              ))}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>

      {/* Statistics */}
      <VStack gap="sm">
        <SectionHeader
          title={t('districtDetail.stats')}
          subtitle={t('districtDetail.stats.subtitle')}
        />
        <QueryBoundary
          query={indicators}
          loading={<LoadingState label={t('districtDetail.stats.loading')} />}
          isEmpty={() => indicators.groups.length === 0}
          emptyTitle={t('districtDetail.stats.empty')}
          emptyMessage={t('districtDetail.stats.emptyMessage')}
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
                      {t('districtDetail.stillCompiling')}
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

      {/* Measured connectivity, matching the district view on the web portal. */}
      {connectivity.data || connectivity.isPending ? (
        <VStack gap="sm">
          <SectionHeader
            title={t('districtDetail.connectivity')}
            subtitle={t('districtDetail.connectivity.subtitle')}
          />
          <QueryBoundary
            query={connectivity}
            loading={<LoadingState label={t('districtDetail.connectivity.loading')} />}
            isEmpty={(data) => data.connections.length === 0}
            emptyTitle={t('districtDetail.connectivity.empty')}
            emptyMessage={t('districtDetail.connectivity.emptyMessage')}
          >
            {(data) => (
              <VStack gap="sm">
                {data.connections.map((connection) => (
                  <Card key={connection.kind} padding="md">
                    <VStack gap="sm">
                      <Text variant="bodyStrong">
                        {connection.kind === 'fixed' ? 'Fixed broadband' : 'Mobile'}
                      </Text>
                      <HStack gap="lg" wrap>
                        <VStack gap="xxs">
                          <Text variant="footnote" color="textMuted">
                            {t('districtDetail.download')}
                          </Text>
                          <Text variant="heading" color="primary">
                            {connection.downloadMbps.toFixed(1)} Mbps
                          </Text>
                        </VStack>
                        <VStack gap="xxs">
                          <Text variant="footnote" color="textMuted">
                            {t('districtDetail.upload')}
                          </Text>
                          <Text variant="bodyStrong">
                            {connection.uploadMbps.toFixed(1)} Mbps
                          </Text>
                        </VStack>
                        <VStack gap="xxs">
                          <Text variant="footnote" color="textMuted">
                            {t('districtDetail.latency')}
                          </Text>
                          <Text variant="bodyStrong">{connection.latencyMs.toFixed(0)} ms</Text>
                        </VStack>
                      </HStack>
                      <Text variant="caption" color="textMuted">
                        {formatNumber(connection.sample.tests)} tests from{' '}
                        {formatNumber(connection.sample.devices)} devices
                        {connection.sample.strength === 'thin'
                          ? ' · thin sample, read cautiously'
                          : ''}
                      </Text>
                      <SourceNote provenance={connection.provenance} />
                    </VStack>
                  </Card>
                ))}
                <Text variant="caption" color="textMuted">
                  {t('districtDetail.notCoverage')}
                </Text>
              </VStack>
            )}
          </QueryBoundary>
        </VStack>
      ) : null}

      {/* Tehsils */}
      <QueryBoundary query={detail} loading={<></>}>
        {(data) =>
          data.tehsils.length === 0 ? (
            <EmptyState title={t('districtDetail.tehsils.empty')} />
          ) : (
            <VStack gap="sm">
              <SectionHeader
                title={t('districtDetail.tehsils')}
                subtitle={t('districtDetail.tehsils.subtitle', { count: data.tehsils.length })}
              />
              <Card padding="md">
                {data.tehsils.map((tehsil, index) => (
                  <VStack key={tehsil.slug}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow
                      title={localise(tehsil.name, language)}
                      subtitle={
                        tehsil.villages.length > 0
                          ? t('districtDetail.villages', {
                              count: formatNumber(tehsil.villages.length),
                            })
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
