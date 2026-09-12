import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, HStack, Icon, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';
import { useRoadNetwork } from '../hooks';

export function RoadsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const roadNetwork = useRoadNetwork();

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
      <Text variant="title">Roads & Traffic</Text>
    </View>
  );

  return (
    <Screen header={header} onRefresh={() => void roadNetwork.refetch()} refreshing={roadNetwork.isRefetching}>
      <VStack gap="sm">
        <SectionHeader title="Highway Network" />
        <QueryBoundary
          query={roadNetwork}
          loading={<LoadingState label="Loading road network" />}
          isEmpty={(data) => data.national.length === 0 && data.state.length === 0}
          emptyTitle="No road data"
        >
          {(data) => (
            <VStack gap="sm">
              <Card padding="md">
                <HStack align="center" justify="space-between">
                  <HStack gap="xs" align="center">
                    <Icon name="car-outline" size={20} tone="primary" />
                    <Text variant="bodyStrong">National Highways</Text>
                  </HStack>
                  <Text variant="footnote" color="textMuted">{data.national.length} routes</Text>
                </HStack>
              </Card>
              <Card padding="md">
                <HStack align="center" justify="space-between">
                  <HStack gap="xs" align="center">
                    <Icon name="git-network-outline" size={20} tone="primary" />
                    <Text variant="bodyStrong">State Highways</Text>
                  </HStack>
                  <Text variant="footnote" color="textMuted">{data.state.length} routes</Text>
                </HStack>
              </Card>
            </VStack>
          )}
        </QueryBoundary>
      </VStack>
    </Screen>
  );
}
