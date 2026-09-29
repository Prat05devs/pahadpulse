import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { Card, Divider, Text, VStack, type IconName } from '@/components/atoms';
import { ListRow, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The overflow tab, grouped by what a reader is trying to do rather than listed flat - the
 * flat list of eleven rows was where people told us they got lost.
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

  type Row = { title: TranslationKey; subtitle: TranslationKey; icon: IconName; href: Href };
  const groups: { title: TranslationKey; rows: Row[] }[] = [
    {
      title: 'more.group.travel',
      rows: [
        {
          title: 'nav.tripCheck',
          subtitle: 'more.trip.subtitle',
          icon: 'calendar-outline',
          href: '/trip-check',
        },
        {
          title: 'more.tourism',
          subtitle: 'more.tourism.subtitle',
          icon: 'compass-outline',
          href: '/tourism',
        },
        {
          title: 'more.roads',
          subtitle: 'more.roads.subtitle',
          icon: 'car-outline',
          href: '/roads',
        },
        {
          title: 'nav.alerts',
          subtitle: 'more.alerts.subtitle',
          icon: 'warning-outline',
          href: '/alerts',
        },
      ],
    },
    {
      title: 'more.group.area',
      rows: [
        {
          title: 'nav.districts',
          subtitle: 'more.districts.subtitle',
          icon: 'list-outline',
          href: '/districts',
        },
        {
          title: 'nav.map',
          subtitle: 'more.map.subtitle',
          icon: 'earth-outline',
          href: '/map',
        },
        {
          title: 'more.airQuality',
          subtitle: 'more.airQuality.subtitle',
          icon: 'cloud-outline',
          href: '/air-quality',
        },
        {
          title: 'more.seismic',
          subtitle: 'more.seismic.subtitle',
          icon: 'pulse-outline',
          href: '/seismic',
        },
        {
          title: 'more.connectivity',
          subtitle: 'more.connectivity.subtitle',
          icon: 'wifi-outline',
          href: '/connectivity',
        },
      ],
    },
    {
      title: 'more.group.business',
      rows: [
        {
          title: 'more.compare',
          subtitle: 'more.compare.subtitle',
          icon: 'git-compare-outline',
          href: '/compare',
        },
        {
          title: 'nav.schemes',
          subtitle: 'more.schemes.subtitle',
          icon: 'briefcase-outline',
          href: '/schemes',
        },
        {
          title: 'nav.budget',
          subtitle: 'more.budget.subtitle',
          icon: 'wallet-outline',
          href: '/budget',
        },
        {
          title: 'nav.dataExplorer',
          subtitle: 'more.data.subtitle',
          icon: 'stats-chart-outline',
          href: '/data-explorer',
        },
      ],
    },
    {
      title: 'more.group.app',
      rows: [
        {
          title: 'nav.assistant',
          subtitle: 'more.assistant.subtitle',
          icon: 'chatbubble-ellipses-outline',
          href: '/assistant',
        },
        {
          title: 'nav.settings',
          subtitle: 'more.settings.subtitle',
          icon: 'settings-outline',
          href: '/settings',
        },
        {
          title: 'more.welcome',
          subtitle: 'more.welcome.subtitle',
          icon: 'sparkles-outline',
          href: '/welcome',
        },
        {
          title: 'more.credits',
          subtitle: 'more.credits.subtitle',
          icon: 'information-circle-outline',
          href: '/credits',
        },
      ],
    },
  ];

  return (
    <Screen header={header}>
      {groups.map((group) => (
        <VStack key={group.title} gap="sm">
          <SectionHeader title={t(group.title)} />
          <Card padding="md">
            {group.rows.map((row, index) => (
              <View key={row.title}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  title={t(row.title)}
                  subtitle={t(row.subtitle)}
                  icon={row.icon}
                  onPress={() => router.push(row.href)}
                />
              </View>
            ))}
          </Card>
        </VStack>
      ))}
    </Screen>
  );
}
