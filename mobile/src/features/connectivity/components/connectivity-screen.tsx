import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, HStack, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary, SectionHeader, StatTile } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';
import { useStateNetwork } from '../hooks';

export function ConnectivityScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const network = useStateNetwork();

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
      <Text variant="title">Internet Connectivity</Text>
    </View>
  );

  return (
    <Screen header={header} onRefresh={() => void network.refetch()} refreshing={network.isRefetching}>
      <VStack gap="sm">
        <SectionHeader title="State Overview" />
        <QueryBoundary
          query={network}
          loading={<LoadingState label="Loading network data" />}
          isEmpty={(data) => data.spread.length === 0}
          emptyTitle="No data available"
        >
          {(data) => (
            <VStack gap="sm">
              {data.spread.map((s, idx) => (
                <Card key={idx} padding="md">
                  <VStack gap="sm">
                    <Text variant="bodyStrong">{s.kind === 'mobile' ? 'Mobile Data' : 'Fixed Broadband'}</Text>
                    <HStack gap="sm" wrap>
                      <StatTile
                        label="State Average"
                        value={s.stateAverageMbps.toFixed(1)}
                        unit=" Mbps"
                        countTo={s.stateAverageMbps}
                        countFormat={(next) => next.toFixed(1)}
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
