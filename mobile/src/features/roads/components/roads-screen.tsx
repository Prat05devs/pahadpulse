import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { Card, Divider, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import {
  Chip,
  LoadingState,
  QueryBoundary,
  SectionHeader,
  SourceNote,
  StatTile,
} from '@/components/molecules';
import { useT } from '@/i18n';
import { Screen } from '@/components/templates';
import { formatDate, formatNumber, localise } from '@/lib/format';
import { shouldStackCardGrid } from '@/lib/layout';
import { useTheme } from '@/theme';

import { useDistricts } from '@/features/areas/hooks';
import { useLanguage } from '@/stores';

import { closureCounts } from '../closures';
import { useRoadClosures, useRoadNetwork } from '../hooks';
import { RoadClosuresPanel } from './road-closures-panel';

type Network = 'NH' | 'SH';

/**
 * Roads: what is closed first, then the highway register.
 *
 * Closures lead because "can I drive there today?" is the question a reader opens this screen
 * with; the register is reference material for the map.
 */
export function RoadsScreen({ district }: { district?: string }) {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackSummaryCards = shouldStackCardGrid(width, fontScale);
  const [network, setNetwork] = useState<Network>('NH');
  const roadNetwork = useRoadNetwork();
  const language = useLanguage();
  const [scope, setScope] = useState<string | undefined>(district);
  const closures = useRoadClosures(scope);
  const districts = useDistricts();
  const scopeName =
    scope === undefined
      ? t('common.uttarakhand')
      : localise(districts.data?.find((entry) => entry.slug === scope)?.name, language) ||
        scope;
  const counts = closures.data?.available ? closureCounts(closures.data) : null;

  return (
    <Screen
      onRefresh={() => {
        void roadNetwork.refetch();
        void closures.refetch();
      }}
      refreshing={roadNetwork.isRefetching || closures.isRefetching}
    >
      <VStack gap="sm">
        <SectionHeader
          title={t('roads.closures.title')}
          subtitle={t('roads.closures.subtitle')}
        />
        {district !== undefined ? (
          <HStack gap="xs" wrap>
            <Chip
              label={scopeName}
              selected={scope !== undefined}
              onPress={() => setScope(district)}
            />
            <Chip
              label={t('common.uttarakhand')}
              selected={scope === undefined}
              onPress={() => setScope(undefined)}
            />
          </HStack>
        ) : null}
        {counts !== null ? (
          <HStack gap="sm" wrap>
            <StatTile
              label={t('roads.closures.closed')}
              value={formatNumber(counts.closed)}
              icon="close-circle-outline"
              tone={counts.closed > 0 ? 'danger' : 'default'}
              live
            />
            <StatTile
              label={t('roads.closures.highways')}
              value={formatNumber(counts.highways)}
              icon="car-outline"
            />
          </HStack>
        ) : null}
        {closures.isPending ? (
          <LoadingState label={t('roads.closures.loading')} />
        ) : (
          <RoadClosuresPanel
            report={closures.data ?? null}
            showDistrict={scope === undefined}
            scopeLabel={scopeName}
          />
        )}
      </VStack>

      <QueryBoundary
        query={roadNetwork}
        loading={<LoadingState label={t('roads.loading')} />}
        isEmpty={(data) => data.national.length === 0 && data.state.length === 0}
        emptyTitle={t('roads.empty')}
      >
        {(data) => {
          const routes = network === 'NH' ? data.national : data.state;
          const source = data.national[0]?.provenance ?? data.state[0]?.provenance ?? null;
          return (
            <VStack gap="lg">
              <HStack gap="sm" wrap>
                <Card
                  padding="md"
                  style={stackSummaryCards ? { width: '100%' } : { flex: 1, minWidth: 145 }}
                >
                  <VStack gap="xs">
                    <Text variant="footnote" color="textMuted">
                      {t('roads.nationalUpper')}
                    </Text>
                    <Text variant="metric" color="primary">
                      {formatNumber(data.national.length)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      recorded routes
                    </Text>
                  </VStack>
                </Card>
                <Card
                  padding="md"
                  style={stackSummaryCards ? { width: '100%' } : { flex: 1, minWidth: 145 }}
                >
                  <VStack gap="xs">
                    <Text variant="footnote" color="textMuted">
                      {t('roads.stateUpper')}
                    </Text>
                    <Text variant="metric" color="accent">
                      {formatNumber(data.state.length)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      recorded routes
                    </Text>
                  </VStack>
                </Card>
              </HStack>

              <VStack gap="sm">
                <SectionHeader
                  title={t('roads.register')}
                  subtitle={t('roads.register.subtitle')}
                />
                <HStack gap="xs" wrap>
                  <Chip
                    label={t('roads.national', { count: data.national.length })}
                    selected={network === 'NH'}
                    onPress={() => setNetwork('NH')}
                  />
                  <Chip
                    label={t('roads.state', { count: data.state.length })}
                    selected={network === 'SH'}
                    onPress={() => setNetwork('SH')}
                  />
                </HStack>
                <Card padding="md">
                  {routes.map((route, index) => (
                    <VStack key={route.id} gap="sm">
                      {index > 0 ? <Divider /> : null}
                      <HStack justify="space-between" align="center">
                        <HStack gap="sm" align="center">
                          <Icon
                            name={network === 'NH' ? 'car-outline' : 'git-network-outline'}
                            tone={network === 'NH' ? 'primary' : 'accent'}
                          />
                          <Text variant="heading">{route.ref}</Text>
                        </HStack>
                        <Text variant="caption" color="textMuted">
                          {formatNumber(route.segmentCount)} mapped segment
                          {route.segmentCount === 1 ? '' : 's'}
                        </Text>
                      </HStack>
                    </VStack>
                  ))}
                </Card>
              </VStack>

              <Pressable
                onPress={() => router.push('/map')}
                accessibilityLabel={t('roads.openMap')}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text variant="bodyStrong" color="textInverse">
                  {t('roads.openMap')}
                </Text>
              </Pressable>

              <Card tone="muted" elevation="none">
                <Text variant="caption" color="textMuted">
                  This is a crowd-sourced map register, not an NHAI or PWD register. A highway
                  may be missing or newly renumbered.
                  {source ? t('roads.networkRead', { date: formatDate(source.vintage) }) : ''}
                </Text>
              </Card>
              <SourceNote provenance={source} />
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
