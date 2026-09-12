import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { Card, Divider, Text, VStack } from '@/components/atoms';
import { ListRow, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';

/**
 * The overflow tab.
 */
export function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      <Text variant="title">More</Text>
    </View>
  );

  return (
    <Screen header={header}>
      <VStack gap="sm">
        <SectionHeader title="In the app" />
        <Card padding="md">
          <ListRow
            title="Districts"
            subtitle="All thirteen, with statistics and sources"
            icon="map-outline"
            onPress={() => router.push('/districts')}
          />
          <Divider />
          <ListRow
            title="Alerts"
            subtitle="Weather, river, road and disaster warnings"
            icon="warning-outline"
            onPress={() => router.push('/alerts')}
          />
          <Divider />
          <ListRow
            title="Map"
            subtitle="Districts, highways and alerts in relief"
            icon="earth-outline"
            onPress={() => router.push('/map')}
          />
          <Divider />
          <ListRow
            title="Tourism"
            subtitle="Char Dham visitor tracking and loads"
            icon="compass-outline"
            onPress={() => router.push('/tourism')}
          />
          <Divider />
          <ListRow
            title="Compare Districts"
            subtitle="Compare ease of doing business across districts"
            icon="trending-up-outline"
            onPress={() => router.push('/compare')}
          />
          <Divider />
          <ListRow
            title="Roads & Traffic"
            subtitle="Highway network closures and traffic"
            icon="car-outline"
            onPress={() => router.push('/roads')}
          />
          <Divider />
          <ListRow
            title="Connectivity"
            subtitle="Fixed and mobile network performance"
            icon="wifi-outline"
            onPress={() => router.push('/connectivity')}
          />

          <ListRow
            title="Seismic"
            subtitle="Recent earthquake events"
            icon="pulse-outline"
            onPress={() => router.push('/seismic')}
          />
          <Divider />
          <ListRow
            title="Settings"
            subtitle="Language, appearance and your data"
            icon="settings-outline"
            onPress={() => router.push('/settings')}
          />
          <Divider />
          <ListRow
            title="Data and technology"
            subtitle="Where every figure and the map itself come from"
            icon="information-circle-outline"
            onPress={() => router.push('/credits')}
          />
        </Card>
      </VStack>
    </Screen>
  );
}
