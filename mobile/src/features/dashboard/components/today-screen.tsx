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
          accessibilityLabel="Pahad Pulse. Today in Uttarakhand"
        >
          <Text
            variant="footnote"
            color="primary"
            weight="semibold"
            style={{ letterSpacing: 0.8 }}
          >
            PAHAD PULSE
          </Text>
          <Text variant="title">Today in Uttarakhand</Text>
        </VStack>

        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Open settings"
          accessibilityHint="Opens language, appearance and app preferences"
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
          label="Active alerts"
          value={summary.isPending ? '—' : formatCompact(activeCount)}
          // Counted up, and only once the figure is real: animating from zero while the
          // request is still in flight would show a confident "0 alerts" that is not known yet.
          countTo={summary.isPending ? undefined : activeCount}
          countFormat={(next) => formatCompact(Math.round(next))}
          // The one figure in the app that is genuinely live — alerts expire by the hour.
          live={!summary.isPending && !summary.isError}
          icon="warning-outline"
          tone={severeCount > 0 ? 'danger' : 'default'}
          caption={severeCount > 0 ? `${severeCount} severe or worse` : 'Statewide'}
        />
        <StatTile
          label="Districts"
          value={districts.isPending ? '—' : formatCompact(districts.data?.length ?? 0)}
          countTo={districts.isPending ? undefined : (districts.data?.length ?? 0)}
          countFormat={(next) => formatCompact(Math.round(next))}
          icon="map-outline"
          /*
           * Grouped, not compacted: `formatCompact` renders 13,545 as "13 K", which sits
           * directly under the district count of 13 and reads as the same number twice.
           * The caption has room for the real figure.
           */
          caption={totalVillages > 0 ? `${formatNumber(totalVillages)} villages` : undefined}
        />
      </HStack>

      <VStack gap="sm">
        <SectionHeader
          title="Uttarakhand at a glance"
          subtitle="Published state profile figures"
        />
        <QueryBoundary
          query={stateIndicators}
          loading={<LoadingState label="Loading state profile" />}
          isEmpty={(data) => data.values.length === 0}
          emptyTitle="No state profile figures"
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
                    style={
                      stackProfileCards
                        ? { width: '100%' }
                        : { flex: 1, minWidth: 145 }
                    }
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
            title="Following"
            subtitle="Districts you saved"
            onPressAction={() => router.push('/districts')}
            actionLabel="Manage"
          />
          <SavedDistrictStrip slugs={savedSlugs} />
        </VStack>
      ) : (
        <Card tone="muted" elevation="none">
          <HStack align="center" gap="md">
            <Icon name="bookmark-outline" size={22} tone="primary" />
            <VStack grow gap="xxs">
              <Text variant="bodyStrong">Follow a district</Text>
              <Text variant="caption" color="textMuted">
                Saved districts appear here with their weather and alerts.
              </Text>
            </VStack>
            <Pressable
              onPress={() => router.push('/districts')}
              accessibilityLabel="Browse districts"
              style={{ minHeight: 0 }}
            >
              <Text variant="footnote" color="primary">
                Browse
              </Text>
            </Pressable>
          </HStack>
        </Card>
      )}

      {/* Alerts */}
      <VStack gap="sm">
        <SectionHeader
          title="Latest alerts"
          subtitle="Issued by IMD, CWC and district administrations"
          onPressAction={() => router.push('/alerts')}
        />
        <QueryBoundary
          query={alerts}
          loading={<LoadingState label="Loading alerts" />}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No active alerts"
          emptyMessage="Nothing is in force across the state right now."
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
          title="Districts"
          subtitle="Open one for its statistics and sources"
          onPressAction={() => router.push('/districts')}
        />
        <QueryBoundary
          query={districts}
          loading={<LoadingState label="Loading districts" />}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No districts loaded"
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
        <SectionHeader title="Explore" subtitle="More state intelligence" />
        {/*
         * `wrap` so that when StatTile asks to stack (narrow screen or large system font) the
         * tiles actually fall onto their own rows. Without it a full-width basis in a
         * non-wrapping row just squeezed both tiles back to half width.
         */}
        <HStack gap="sm" wrap>
          <StatTile
            label="Tourism"
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
            label="Ease of Biz"
            value="Compare"
            icon="briefcase-outline"
            onPress={() => router.push('/compare')}
          />
        </HStack>
        <HStack gap="sm" wrap>
          <StatTile
            label="Connectivity"
            value="Network"
            icon="wifi-outline"
            onPress={() => router.push('/connectivity')}
          />
          <StatTile
            label="Roads"
            value="Highways"
            icon="car-outline"
            onPress={() => router.push('/roads')}
          />
        </HStack>
      </VStack>

      <Card tone="muted" elevation="none">
        <HStack gap="md" align="center">
          <Icon name="shield-checkmark-outline" size={20} tone="primary" />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            Pahad Pulse does not author data. Every figure shows the department that published
            it, the date it describes, and how fresh it is.
          </Text>
        </HStack>
      </Card>
    </Screen>
  );
}
