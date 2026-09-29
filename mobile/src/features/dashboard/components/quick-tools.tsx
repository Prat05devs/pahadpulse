import { useRouter, type Href } from 'expo-router';
import { ScrollView } from 'react-native';

import { HStack, Icon, type IconName, Pressable, Text, VStack } from '@/components/atoms';
import { useT, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';

const TOOLS: { label: TranslationKey; icon: IconName; href: Href }[] = [
  { label: 'nav.map', icon: 'map-outline', href: '/map' },
  { label: 'nav.compare', icon: 'git-compare-outline', href: '/compare' },
  { label: 'nav.dataExplorer', icon: 'stats-chart-outline', href: '/data-explorer' },
  { label: 'nav.airQuality', icon: 'cloud-outline', href: '/air-quality' },
  { label: 'nav.seismic', icon: 'pulse-outline', href: '/seismic' },
];

/** The state-wide tools, as one swipeable row of shortcuts. */
export function QuickTools() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <VStack gap="sm">
      <HStack align="center" justify="space-between">
        <Text variant="bodyStrong" accessibilityRole="header">
          {t('home.quick.title')}
        </Text>
        <Text variant="footnote" weight="semibold" color="primary">
          {t('home.quick.count', { count: TOOLS.length })}
        </Text>
      </HStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleeds to the screen edge so the row visibly continues past it.
        style={{ marginHorizontal: -theme.spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}
      >
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.label}
            onPress={() => router.push(tool.href)}
            accessibilityLabel={t(tool.label)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surfaceInteractive,
            }}
          >
            <Icon name={tool.icon} size={18} tone="primary" />
            <Text variant="caption" weight="bold">
              {t(tool.label)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </VStack>
  );
}
