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
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatDate, formatNumber } from '@/lib/format';
import { shouldStackCardGrid } from '@/lib/layout';
import { useTheme } from '@/theme';

import { useRoadNetwork } from '../hooks';

type Network = 'NH' | 'SH';

export function RoadsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackSummaryCards = shouldStackCardGrid(width, fontScale);
  const [network, setNetwork] = useState<Network>('NH');
  const roadNetwork = useRoadNetwork();

  return (
    <Screen onRefresh={() => void roadNetwork.refetch()} refreshing={roadNetwork.isRefetching}>
      <Card style={{ borderColor: theme.colors.warning, borderWidth: 1 }} elevation="none">
        <HStack gap="sm" align="flex-start">
          <Icon name="warning-outline" tone="warning" />
          <Text variant="caption" style={{ flex: 1 }}>
            <Text variant="bodyStrong">This does not show whether a road is open.</Text>{' '}
            Closures and landslide blocks have no reliable live feed here. Check the district
            administration before travelling.
          </Text>
        </HStack>
      </Card>

      <QueryBoundary
        query={roadNetwork}
        loading={<LoadingState label="Loading road network" />}
        isEmpty={(data) => data.national.length === 0 && data.state.length === 0}
        emptyTitle="No road data"
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
                      NATIONAL HIGHWAYS
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
                      STATE HIGHWAYS
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
                  title="Highway register"
                  subtitle="Reference and mapped segment count"
                />
                <HStack gap="xs" wrap>
                  <Chip
                    label={`National (${data.national.length})`}
                    selected={network === 'NH'}
                    onPress={() => setNetwork('NH')}
                  />
                  <Chip
                    label={`State (${data.state.length})`}
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
                accessibilityLabel="Open highway map"
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text variant="bodyStrong" color="textInverse">
                  Open highway map
                </Text>
              </Pressable>

              <Card tone="muted" elevation="none">
                <Text variant="caption" color="textMuted">
                  This is a crowd-sourced map register, not an NHAI or PWD register. A highway
                  may be missing or newly renumbered.
                  {source ? ` Network read ${formatDate(source.vintage)}.` : ''}
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
