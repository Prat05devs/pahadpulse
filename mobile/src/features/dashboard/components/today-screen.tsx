import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Card, HStack, Icon, LiveDot, Pressable, Text, VStack } from '@/components/atoms';
import { Screen } from '@/components/templates';
import { useActiveAlerts, useAlertSummary } from '@/features/alerts';
import { AssistantLaunchCard } from '@/features/assistant';
import { useT } from '@/i18n';
import { useSavedDistricts } from '@/stores';
import { useTheme } from '@/theme';

import { FollowedDistricts } from './followed-districts';
import { LocationStrip } from './location-strip';
import { QuickTools } from './quick-tools';
import { SignalGrid } from './signal-grid';
import { StateGlance } from './state-glance';
import { TodayHeader } from './today-header';
import { TripHero } from './trip-hero';
import { UrgentWarning } from './urgent-warning';

/**
 * The landing screen: what is happening across Uttarakhand right now.
 *
 * It answers the portal's central question - "what is happening in this district, and where
 * does that number come from?" - in the order a reader needs it: an urgent warning if there
 * is one, the trip check, the state's signals, the districts they follow, then the published
 * state profile and where all of it comes from.
 */
export function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const queryClient = useQueryClient();
  const savedSlugs = useSavedDistricts();

  const summary = useAlertSummary();
  const alerts = useActiveAlerts();
  const live = summary.data !== undefined && !summary.isError;

  // Every section owns its queries, so a pull refreshes whatever is on screen.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <Screen header={<TodayHeader />} onRefresh={() => void refresh()} refreshing={refreshing}>
      <LocationStrip slug={savedSlugs[0] ?? ''} updatedAt={summary.dataUpdatedAt} live={live} />

      {alerts.data ? <UrgentWarning alerts={alerts.data} /> : null}

      <TripHero />

      <AssistantLaunchCard />

      <QuickTools />

      <VStack gap="sm">
        <HStack align="center" justify="space-between" gap="sm">
          <HStack align="center" gap="sm">
            <Text variant="heading" weight="bold" accessibilityRole="header">
              {t('home.signals.title')}
            </Text>
            <LiveDot tone="primary" size={7} active={live} />
          </HStack>
          <Text variant="footnote" color="textMuted">
            {t('home.signals.live')}
          </Text>
        </HStack>
        <SignalGrid />
      </VStack>

      {savedSlugs.length > 0 ? (
        <FollowedDistricts slugs={savedSlugs} />
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

      <StateGlance />

      <VStack
        gap="sm"
        padding="lg"
        align="center"
        style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted }}
      >
        <HStack align="center" gap="xs">
          <Icon name="shield-checkmark" size={18} tone="primary" />
          <Text variant="caption" weight="bold" color="primary">
            {t('today.trust.title')}
          </Text>
        </HStack>
        <Text variant="caption" color="textMuted" align="center">
          {t('today.promise')}
        </Text>
        <HStack gap="sm" justify="center" wrap>
          <Pressable
            onPress={() => void refresh()}
            disabled={refreshing}
            accessibilityLabel={t('today.trust.refresh')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceInteractive,
            }}
          >
            <Icon name="refresh" size={16} tone="text" />
            <Text variant="footnote" weight="semibold">
              {t('today.trust.refresh')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/credits')}
            accessibilityLabel={t('nav.credits')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primaryMuted,
            }}
          >
            <Icon name="library-outline" size={16} tone="primary" />
            <Text variant="footnote" weight="semibold" color="primary">
              {t('nav.credits')}
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </Screen>
  );
}
