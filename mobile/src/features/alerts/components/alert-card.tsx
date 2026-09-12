import { memo } from 'react';

import { Card, HStack, Icon, Pressable, Text, VStack, type IconName } from '@/components/atoms';
import { SeverityBadge, SourceNote } from '@/components/molecules';
import { formatRelative, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import type { Alert } from '../schemas';

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
 * The severity stripe down the left edge carries the same information as the badge on
 * purpose: severity has to survive being scanned at arm's length in a list of twenty, and
 * colour alone fails for a colour-blind reader — hence both a stripe and a worded badge.
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

  const areas = alert.areas.map((area) => localise(area.name, language)).filter(Boolean);
  const areaLabel =
    areas.length === 0
      ? 'Statewide'
      : areas.length <= 2
        ? areas.join(', ')
        : `${areas.slice(0, 2).join(', ')} +${areas.length - 2}`;

  const label = `${alert.severity} ${alert.type} alert. ${alert.headline}. Affects ${areaLabel}.`;

  const card = (
    <Card
      // The severity stripe has to reach the card's edges, so padding moves inside.
      style={{ overflow: 'hidden', padding: 0 }}
      accessible={!onPress}
      accessibilityLabel={onPress ? undefined : label}
    >
      <HStack>
        <VStack
          style={{ width: 4, backgroundColor: theme.colors.severity[alert.severity] }}
        />

        <VStack grow gap="sm" padding="lg">
          <HStack align="center" gap="sm" wrap>
            <Icon name={TYPE_ICONS[alert.type]} size={16} tone="textMuted" />
            <SeverityBadge severity={alert.severity} />
            <Text variant="footnote" color="textMuted">
              {formatRelative(alert.issuedAt)}
            </Text>
          </HStack>

          <Text variant="bodyStrong" numberOfLines={3}>
            {alert.headline}
          </Text>

          <HStack align="center" gap="xs">
            <Icon name="location-outline" size={13} tone="textMuted" />
            <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
              {areaLabel}
            </Text>
          </HStack>

          <SourceNote provenance={alert.provenance} compact />
        </VStack>
      </HStack>
    </Card>
  );

  if (!onPress) return card;

  return (
    <Pressable onPress={() => onPress(alert.id)} accessibilityLabel={label} style={{ minHeight: 0 }}>
      {card}
    </Pressable>
  );
});
