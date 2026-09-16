import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { Card, Divider, Text, VStack } from '@/components/atoms';
import { ListRow, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The overflow tab.
 */
export function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
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
      <Text variant="title">{t('more.title')}</Text>
    </View>
  );

  return (
    <Screen header={header}>
      <VStack gap="sm">
        <SectionHeader title={t('more.inTheApp')} />
        <Card padding="md">
          <ListRow
            title={t('nav.districts')}
            subtitle={t('more.districts.subtitle')}
            icon="map-outline"
            onPress={() => router.push('/districts')}
          />
          <Divider />
          <ListRow
            title={t('nav.alerts')}
            subtitle={t('more.alerts.subtitle')}
            icon="warning-outline"
            onPress={() => router.push('/alerts')}
          />
          <Divider />
          <ListRow
            title={t('nav.map')}
            subtitle={t('more.map.subtitle')}
            icon="earth-outline"
            onPress={() => router.push('/map')}
          />
          <Divider />
          <ListRow
            title={t('more.tourism')}
            subtitle={t('more.tourism.subtitle')}
            icon="compass-outline"
            onPress={() => router.push('/tourism')}
          />
          <Divider />
          <ListRow
            title={t('more.compare')}
            subtitle={t('more.compare.subtitle')}
            icon="trending-up-outline"
            onPress={() => router.push('/compare')}
          />
          <Divider />
          <ListRow
            title={t('more.roads')}
            subtitle={t('more.roads.subtitle')}
            icon="car-outline"
            onPress={() => router.push('/roads')}
          />
          <Divider />
          <ListRow
            title={t('more.connectivity')}
            subtitle={t('more.connectivity.subtitle')}
            icon="wifi-outline"
            onPress={() => router.push('/connectivity')}
          />
          <Divider />
          <ListRow
            title={t('more.airQuality')}
            subtitle={t('more.airQuality.subtitle')}
            icon="cloud-outline"
            onPress={() => router.push('/air-quality')}
          />
          <Divider />
          <ListRow
            title={t('more.seismic')}
            subtitle={t('more.seismic.subtitle')}
            icon="pulse-outline"
            onPress={() => router.push('/seismic')}
          />
          <Divider />
          <ListRow
            title={t('nav.settings')}
            subtitle={t('more.settings.subtitle')}
            icon="settings-outline"
            onPress={() => router.push('/settings')}
          />
          <Divider />
          <ListRow
            title={t('more.credits')}
            subtitle={t('more.credits.subtitle')}
            icon="information-circle-outline"
            onPress={() => router.push('/credits')}
          />
        </Card>
      </VStack>
    </Screen>
  );
}
