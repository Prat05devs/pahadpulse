import { memo } from 'react';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Platform, View } from 'react-native';

import { HStack, Icon, Pressable, Text, VStack, type IconName } from '@/components/atoms';
import { SeverityBadge, SourceNote } from '@/components/molecules';
import { SEVERITY_KEY } from '@/components/molecules/severity-badge';
import { useT, type TranslationKey } from '@/i18n';
import { formatRelative, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';
import { withAlpha } from '@/theme/tokens';

import type { Alert } from '../schemas';

const TYPE_KEY = {
  weather: 'alertType.weather',
  river: 'alertType.river',
  flood: 'alertType.flood',
  road: 'alertType.road',
  disaster: 'alertType.disaster',
} as const satisfies Record<Alert['type'], TranslationKey>;

const TYPE_ICONS: Record<Alert['type'], IconName> = {
  weather: 'thunderstorm-outline',
  river: 'water-outline',
  flood: 'warning-outline',
  road: 'car-outline',
  disaster: 'alert-circle-outline',
};

/**
 * One alert, as it appears in a list.
 *
 * The entire material carries severity while the worded badge and alert-type icon preserve
 * meaning without colour. Native Liquid Glass is used where supported; every other target
 * receives the same hierarchy through a high-opacity semantic surface.
 */
export const AlertCard = memo(function AlertCard({
  alert,
  onPress,
}: {
  alert: Alert;
  /** Takes the id rather than closing over it, so the list passes one stable handler (P3). */
  onPress?: (id: number) => void;
}) {
  const theme = useTheme();
  const language = useLanguage();
  const t = useT();
  const severityColor = theme.colors.severity[alert.severity];
  const supportsNativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  const areas = alert.areas.map((area) => localise(area.name, language)).filter(Boolean);
  const areaLabel =
    areas.length === 0
      ? t('common.statewide')
      : areas.length <= 2
        ? areas.join(', ')
        : t('alerts.card.areasMore', {
            areas: areas.slice(0, 2).join(', '),
            count: areas.length - 2,
          });

  const label = t('alerts.card.label', {
    severity: t(SEVERITY_KEY[alert.severity]),
    type: t(TYPE_KEY[alert.type]),
    headline: alert.headline,
    areas: areaLabel,
  });

  const cardContent = (
    <VStack grow gap="sm" padding="lg">
      <HStack align="center" justify="space-between" gap="sm">
        <HStack align="center" gap="sm" wrap style={{ flex: 1 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(severityColor, theme.scheme === 'dark' ? 0.2 : 0.12),
            }}
          >
            <Icon name={TYPE_ICONS[alert.type]} size={17} color={severityColor} />
          </View>
          <SeverityBadge severity={alert.severity} />
        </HStack>
        <Text variant="footnote" color="textMuted">
          {formatRelative(alert.issuedAt)}
        </Text>
      </HStack>

      <Text variant="bodyStrong" numberOfLines={3}>
        {alert.headline}
      </Text>

      <HStack align="center" gap="xs">
        <Icon name="location-outline" size={13} color={severityColor} />
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
          {areaLabel}
        </Text>
      </HStack>

      <SourceNote provenance={alert.provenance} compact />
    </VStack>
  );

  /*
   * Depth is platform-specific, as it was for the AgniVision advisory cards.
   *
   * iOS keeps a soft glow in the severity colour. Android gets no elevation at all: its
   * outline shadow turns a coloured `shadowColor` into a wide halo around the card rather
   * than a glow, and this frame has no background of its own to cast a clean outline from.
   * There the severity is carried entirely by the opaque `severitySubtle` surface and the
   * tinted border, which is what reads as a severity card on both platforms.
   */
  const frameStyle =
    Platform.OS === 'android'
      ? { borderRadius: theme.radius.xl }
      : {
          borderRadius: theme.radius.xl,
          ...theme.elevation.medium,
          shadowColor: withAlpha(severityColor, 0.42),
        };

  const clippedSurfaceStyle = {
    overflow: 'hidden' as const,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: withAlpha(
      severityColor,
      // A touch stronger on Android, where the border is the only edge the card has.
      Platform.OS === 'android'
        ? theme.scheme === 'dark'
          ? 0.56
          : 0.42
        : theme.scheme === 'dark'
          ? 0.46
          : 0.32
    ),
  };

  const card = (
    <View style={frameStyle}>
      {supportsNativeGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={withAlpha(severityColor, theme.scheme === 'dark' ? 0.16 : 0.1)}
          colorScheme={theme.scheme}
          style={clippedSurfaceStyle}
          accessible={!onPress}
          accessibilityLabel={onPress ? undefined : label}
        >
          {cardContent}
        </GlassView>
      ) : (
        <View
          style={[
            clippedSurfaceStyle,
            { backgroundColor: theme.colors.severitySubtle[alert.severity] },
          ]}
          accessible={!onPress}
          accessibilityLabel={onPress ? undefined : label}
        >
          {cardContent}
        </View>
      )}
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={() => onPress(alert.id)}
      accessibilityLabel={label}
      style={{ minHeight: 0 }}
    >
      {card}
    </Pressable>
  );
});
