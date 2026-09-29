import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Eyebrow, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import type { Alert } from '@/features/alerts';
import { useT } from '@/i18n';
import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme';

import { urgentAlerts } from '../model';

/**
 * The most severe warning in force, raised to the top of the home screen.
 *
 * Renders nothing unless a severe or extreme warning is in force: a banner that is always
 * there stops being read. The warning's own words are shown untranslated, as published.
 *
 * Flat on purpose (A5 in ANDROID_RELEASE.md): a tinted surface with elevation draws a halo
 * on Android.
 */
export function UrgentWarning({ alerts }: { alerts: readonly Alert[] }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  const urgent = urgentAlerts(alerts);
  const top = urgent[0];
  if (!top) return null;

  const ink = theme.colors.severity[top.severity];
  const until = top.expiresAt
    ? t('today.urgent.until', {
        date: `${formatDate(top.expiresAt)}, ${formatTime(top.expiresAt)}`,
      })
    : null;

  return (
    <VStack
      gap="md"
      padding="lg"
      style={{
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.severitySubtle[top.severity],
        borderWidth: 1,
        borderColor: ink,
      }}
    >
      <HStack align="center" justify="space-between" gap="sm" wrap>
        <HStack align="center" gap="sm">
          <View
            style={{
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.sm,
              backgroundColor: ink,
            }}
          >
            <Icon name="warning" size={16} tone="textInverse" />
          </View>
          <Eyebrow weight="bold" ink={ink}>
            {t('today.urgent.eyebrow')}
          </Eyebrow>
        </HStack>
        {until ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xxs,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="footnote" weight="bold" style={{ color: ink }}>
              {until}
            </Text>
          </View>
        ) : null}
      </HStack>

      <VStack gap="xs">
        <Text variant="heading" weight="bold">
          {top.headline}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {top.body}
        </Text>
        {urgent.length > 1 ? (
          <Text variant="footnote" weight="semibold" style={{ color: ink }}>
            {t('today.urgent.more', { count: urgent.length - 1 })}
          </Text>
        ) : null}
      </VStack>

      <Pressable
        onPress={() => router.push(`/alerts/${top.id}`)}
        accessibilityLabel={`${t('today.urgent.cta')}: ${top.headline}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: ink,
        }}
      >
        <Text variant="bodyStrong" color="textInverse">
          {t('today.urgent.cta')}
        </Text>
        <Icon name="arrow-forward" size={18} tone="textInverse" />
      </Pressable>
    </VStack>
  );
}
