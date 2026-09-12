import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, HStack, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary, SectionHeader, StatTile } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';
import { useCharDhamLoad } from '../hooks';
import { formatCompact, localise } from '@/lib/format';
import { useLanguage } from '@/stores';

export function TourismScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  
  const charDhamLoad = useCharDhamLoad();

  const refreshAll = () => {
    void charDhamLoad.refetch();
  };

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
      <Text variant="title">Tourism & Pilgrimage</Text>
    </View>
  );

  return (
    <Screen header={header} onRefresh={refreshAll} refreshing={charDhamLoad.isRefetching}>
      <VStack gap="sm">
        <SectionHeader
          title="Char Dham Yatra"
          subtitle="Live visitor loads at major shrines"
        />
        <QueryBoundary
          query={charDhamLoad}
          loading={<LoadingState label="Loading tourism data" />}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No data available"
        >
          {(list) => (
            <VStack gap="sm">
              {list.map((dest) => {
                const count = dest.latestCount?.count;
                const tone = dest.loadState === 'high' || dest.loadState === 'at_capacity' ? 'danger' : 'primary';
                const capText = dest.loadState === 'at_capacity' ? 'At Capacity' : dest.loadState === 'high' ? 'High Load' : 'Normal';
                
                return (
                  <Card key={dest.id} padding="md">
                    <HStack align="center" justify="space-between">
                      <VStack gap="xxs">
                        <Text variant="bodyStrong">{localise(dest.name, language)}</Text>
                        <Text variant="caption" color="textMuted">Capacity: {formatCompact(dest.dailyCapacity)}/day</Text>
                      </VStack>
                      <StatTile
                        label="Visitors today"
                        value={count ? formatCompact(count) : '—'}
                        countTo={count}
                        countFormat={(next) => formatCompact(Math.round(next))}
                        tone={tone}
                        caption={capText}
                      />
                    </HStack>
                  </Card>
                );
              })}
            </VStack>
          )}
        </QueryBoundary>
      </VStack>
    </Screen>
  );
}
