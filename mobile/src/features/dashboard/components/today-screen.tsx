import { useCallback } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary, SectionHeader, StatTile } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { AlertCard, useActiveAlerts, useAlertSummary } from '@/features/alerts';
import { isAlertInForce } from '@/features/alerts/schemas';
import { useDistricts } from '@/features/areas';
import { useAreaIndicators } from '@/features/indicators';
import { usePilgrimArrivals } from '@/features/tourism/hooks';
import { useAreaWeather } from '@/features/weather';
import { useT } from '@/i18n';
import { formatCompact, formatDate, formatNumber, localise } from '@/lib/format';
import { shouldStackCardGrid } from '@/lib/layout';
import { useLanguage, useSavedDistricts } from '@/stores';
import { useTheme } from '@/theme';

import { SavedDistrictStrip } from './saved-district-strip';

/**
 * The landing screen: what is happening across Uttarakhand right now.
 *
 * It answers the portal's central question — "what is happening in this district, and where
 * does that number come from?" — in the order a reader needs it: warnings first, then the
 * districts they follow, then the state picture.
 */
export function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  // Stable across renders so AlertCard's memo holds.
  const openAlert = useCallback((id: number) => router.push(`/alerts/${id}`), [router]);
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const language = useLanguage();
  const t = useT();
  const savedSlugs = useSavedDistricts();

  const summary = useAlertSummary();
  const alerts = useActiveAlerts();
  const districts = useDistricts();
  const stateIndicators = useAreaIndicators('uttarakhand');
  const arrivals = usePilgrimArrivals();

  /**
   * The state-level weather row. `useAreaWeather` is called with the first followed district
   * so the header shows somewhere the reader actually cares about, falling back to the state
   * area when they follow nothing.
   */
  const focusSlug = savedSlugs[0] ?? '';
  const focusWeather = useAreaWeather(focusSlug);

  const refreshAll = () => {
    void summary.refetch();
    void alerts.refetch();
    void districts.refetch();
    void stateIndicators.refetch();
    void arrivals.refetch();
    if (focusSlug) void focusWeather.refetch();
  };

  const currentAlerts = (alerts.data ?? []).filter((alert) => isAlertInForce(alert));
  const activeCount = summary.isError ? currentAlerts.length : (summary.data?.activeCount ?? 0);
  const severeCount = summary.isError
    ? currentAlerts.filter(
        (alert) => alert.severity === 'severe' || alert.severity === 'extreme'
      ).length
    : (summary.data?.bySeverity.severe ?? 0) + (summary.data?.bySeverity.extreme ?? 0);

  const totalVillages = (districts.data ?? []).reduce((sum, d) => sum + d.counts.villages, 0);
  const stackProfileCards = shouldStackCardGrid(width, fontScale);

  const header = (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <HStack align="center" gap="md">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.brandCanvas,
            borderWidth: 1,
            borderColor: theme.colors.borderSubtle,
            ...theme.elevation.low,
            shadowColor: theme.colors.shadow,
          }}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 36, height: 36 }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <VStack
          grow
          gap="xxs"
          accessible
          accessibilityRole="header"
          accessibilityLabel={t('today.headerLabel')}
        >
          <Text
            variant="footnote"
            color="primary"
            weight="semibold"
            style={{ letterSpacing: 0.8 }}
          >
            {t('today.brand')}
          </Text>
          <Text variant="title">{t('today.title')}</Text>
        </VStack>

        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel={t('today.openSettings')}
          accessibilityHint={t('today.openSettings.hint')}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceInteractive,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
          pressedStyle={{ backgroundColor: theme.colors.pressed }}
        >
          <Icon name="settings-outline" size={21} tone="text" />
        </Pressable>
      </HStack>
    </View>
  );

  return (
    <Screen header={header} onRefresh={refreshAll} refreshing={alerts.isRefetching}>
      {/* State picture */}
      <HStack gap="sm" wrap>
        <StatTile
          label={t('today.activeAlerts')}
          value={summary.isPending ? '—' : formatCompact(activeCount)}
          // Counted up, and only once the figure is real: animating from zero while the
          // request is still in flight would show a confident "0 alerts" that is not known yet.
          countTo={summary.isPending ? undefined : activeCount}
          countFormat={(next) => formatCompact(Math.round(next))}
          // The one figure in the app that is genuinely live — alerts expire by the hour.
          live={!summary.isPending && !summary.isError}
          icon="warning-outline"
          tone={severeCount > 0 ? 'danger' : 'default'}
          caption={
            severeCount > 0
              ? t('today.severeOrWorse', { count: severeCount })
              : t('common.statewide')
          }
        />
        <StatTile
          label={t('nav.districts')}
          value={districts.isPending ? '—' : formatCompact(districts.data?.length ?? 0)}
          countTo={districts.isPending ? undefined : (districts.data?.length ?? 0)}
          countFormat={(next) => formatCompact(Math.round(next))}
          icon="map-outline"
          /*
           * Grouped, not compacted: `formatCompact` renders 13,545 as "13 K", which sits
           * directly under the district count of 13 and reads as the same number twice.
           * The caption has room for the real figure.
           */
          caption={
            totalVillages > 0
              ? t('today.villages', { count: formatNumber(totalVillages) })
              : undefined
          }
        />
      </HStack>

      <VStack gap="sm">
        <SectionHeader title={t('today.glance.title')} subtitle={t('today.glance.subtitle')} />
        <QueryBoundary
          query={stateIndicators}
          loading={<LoadingState label={t('today.glance.loading')} />}
          isEmpty={(data) => data.values.length === 0}
          emptyTitle={t('today.glance.empty')}
        >
          {(data) => (
            <HStack gap="sm" wrap>
              {data.values
                .filter((entry) =>
                  [
                    'state_population',
                    'state_area_sq_km',
                    'state_literacy_rate',
                    'state_forest_cover_pct',
                    'state_villages',
                  ].includes(entry.indicator.key)
                )
                .map((entry) => (
                  <Card
                    key={entry.indicator.key}
                    padding="md"
                    style={stackProfileCards ? { width: '100%' } : { flex: 1, minWidth: 145 }}
                  >
                    <VStack gap="xs">
                      <Text variant="footnote" color="textMuted">
                        {localise(entry.indicator.label, language).toUpperCase()}
                      </Text>
                      <Text variant="heading" tabular>
                        {formatNumber(entry.value, entry.indicator.decimals)}
                        {entry.indicator.unit === 'percent' || entry.indicator.unit === 'pct'
                          ? '%'
                          : entry.indicator.unit === 'sq_km'
                            ? ' km²'
                            : ''}
                      </Text>
                      <Text variant="footnote" color="textMuted">
                        {formatDate(entry.vintage)} ·{' '}
                        {entry.provenance?.department
                          ? localise(entry.provenance.department, language)
                          : 'Source not recorded'}
                      </Text>
                    </VStack>
                  </Card>
                ))}
            </HStack>
          )}
        </QueryBoundary>
      </VStack>

      {/* Districts the reader follows */}
      {savedSlugs.length > 0 ? (
        <VStack gap="sm">
          <SectionHeader
            title={t('today.following.title')}
            subtitle={t('today.following.subtitle')}
            onPressAction={() => router.push('/districts')}
            actionLabel={t('today.following.manage')}
          />
          <SavedDistrictStrip slugs={savedSlugs} />
        </VStack>
      ) : (
        <Card tone="muted" elevation="none">
          <HStack align="center" gap="md">
            <Icon name="bookmark-outline" size={22} tone="primary" />
            <VStack grow gap="xxs">
              <Text variant="bodyStrong">{t('today.follow.title')}</Text>
              <Text variant="caption" color="textMuted">
                {t('today.follow.body')}
              </Text>
            </VStack>
            <Pressable
              onPress={() => router.push('/districts')}
              accessibilityLabel={t('today.follow.browseLabel')}
              style={{ minHeight: 0 }}
            >
              <Text variant="footnote" color="primary">
                {t('today.follow.browse')}
              </Text>
            </Pressable>
          </HStack>
        </Card>
      )}

      {/* Alerts */}
      <VStack gap="sm">
        <SectionHeader
          title={t('today.alerts.title')}
          subtitle={t('today.alerts.subtitle')}
          onPressAction={() => router.push('/alerts')}
        />
        <QueryBoundary
          query={alerts}
          loading={<LoadingState label={t('today.alerts.loading')} />}
          isEmpty={(list) => list.length === 0}
          emptyTitle={t('today.alerts.empty')}
          emptyMessage={t('today.alerts.emptyMessage')}
        >
          {(list) => (
            <VStack gap="sm">
              {list
                .filter((alert) => isAlertInForce(alert))
                .slice(0, 4)
                .map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onPress={openAlert} />
                ))}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>

      {/* Districts */}
      <VStack gap="sm">
        <SectionHeader
          title={t('nav.districts')}
          subtitle={t('today.districts.subtitle')}
          onPressAction={() => router.push('/districts')}
        />
        <QueryBoundary
          query={districts}
          loading={<LoadingState label={t('today.districts.loading')} />}
          isEmpty={(list) => list.length === 0}
          emptyTitle={t('today.districts.empty')}
        >
          {(list) => (
            <Card padding="md">
              <HStack gap="xs" wrap>
                {list.map((district) => (
                  <Pressable
                    key={district.slug}
                    onPress={() => router.push(`/districts/${district.slug}`)}
                    accessibilityLabel={localise(district.name, language)}
                    style={{
                      minHeight: 34,
                      justifyContent: 'center',
                      paddingHorizontal: theme.spacing.md,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text variant="caption">{localise(district.name, language)}</Text>
                  </Pressable>
                ))}
              </HStack>
            </Card>
          )}
        </QueryBoundary>
      </VStack>

      {/* Quick Access */}
      <VStack gap="sm">
        <SectionHeader
          title={t('today.explore.title')}
          subtitle={t('today.explore.subtitle')}
        />
        {/*
         * `wrap` so that when StatTile asks to stack (narrow screen or large system font) the
         * tiles actually fall onto their own rows. Without it a full-width basis in a
         * non-wrapping row just squeezed both tiles back to half width.
         */}
        <HStack gap="sm" wrap>
          <StatTile
            label={t('today.explore.tourism')}
            value={
              arrivals.isPending
                ? '—'
                : arrivals.data?.totals?.length
                  ? formatCompact(
                      arrivals.data.totals.find((total) => total.year === 2025)?.visitors ??
                        arrivals.data.totals.at(-1)?.visitors ??
                        0
                    )
                  : 'Statewide'
            }
            icon="compass-outline"
            onPress={() => router.push('/tourism')}
          />
          <StatTile
            label={t('today.explore.business')}
            value={t('today.explore.compare')}
            icon="briefcase-outline"
            onPress={() => router.push('/compare')}
          />
        </HStack>
        <HStack gap="sm" wrap>
          <StatTile
            label={t('today.explore.connectivity')}
            value={t('today.explore.network')}
            icon="wifi-outline"
            onPress={() => router.push('/connectivity')}
          />
          <StatTile
            label={t('today.explore.roads')}
            value={t('today.explore.highways')}
            icon="car-outline"
            onPress={() => router.push('/roads')}
          />
        </HStack>
      </VStack>

      <Card tone="muted" elevation="none">
        <HStack gap="md" align="center">
          <Icon name="shield-checkmark-outline" size={20} tone="primary" />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            {t('today.promise')}
          </Text>
        </HStack>
      </Card>
    </Screen>
  );
}
