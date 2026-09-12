import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, HStack, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary, SectionHeader, StatTile } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';
import { useRecentSeismic } from '../hooks';

export function SeismicScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const seismic = useRecentSeismic();

  const header = (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="title">Seismic Activity</Text>
    </View>
  );

  return (
    <Screen header={header} onRefresh={() => void seismic.refetch()} refreshing={seismic.isRefetching}>
      <VStack gap="sm">
        <SectionHeader title="Recent Earthquakes" />
        <QueryBoundary
          query={seismic}
          loading={<LoadingState label="Loading seismic data" />}
          isEmpty={(data) => data.events.length === 0}
          emptyTitle="No recent events"
        >
          {(data) => (
            <VStack gap="sm">
              {data.events.map((event) => (
                <Card key={event.id} padding="md">
                  <VStack gap="sm">
                    <HStack align="center" justify="space-between">
                      <VStack gap="xxs" style={{ flex: 1 }}>
                        <Text variant="bodyStrong">{event.place}</Text>
                        <Text variant="caption" color="textMuted">{new Date(event.occurredAt).toLocaleString()}</Text>
                      </VStack>
                      <StatTile
                        label="Magnitude"
                        value={event.magnitude.toFixed(1)}
                        countTo={event.magnitude}
                        countFormat={(next) => next.toFixed(1)}
                        tone={event.magnitude > 4.5 ? 'danger' : 'accent'}
                      />
                    </HStack>
                  </VStack>
                </Card>
              ))}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>
    </Screen>
  );
}
