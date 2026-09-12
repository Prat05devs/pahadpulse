import {
  AnimatedNumber,
  Card,
  HStack,
  Icon,
  LiveDot,
  Pressable,
  Text,
  VStack,
  type IconName,
} from '@/components/atoms';
import { useTheme } from '@/theme';

type StatTileProps = {
  label: string;
  /** Pre-formatted. The tile does not know what a population or a temperature is. */
  value: string;
  unit?: string;
  icon?: IconName;
  /** A short qualifier under the figure, usually its vintage or source. */
  caption?: string;
  tone?: 'default' | 'primary' | 'accent' | 'danger';
  onPress?: () => void;
  /**
   * The figure as a number, when it is one, so the tile can count up to it.
   *
   * Separate from `value` rather than replacing it: most tiles show something that is not a
   * plain number — a temperature with a degree sign, an em dash while loading — and those
   * must keep working. When this is given, `countFormat` renders each step and `value` is
   * only the accessible reading.
   */
  countTo?: number;
  countFormat?: (value: number) => string;
  /** Shows a pulsing dot beside the label, for a figure that is genuinely kept current. */
  live?: boolean;
};

const TONE_COLORS = {
  default: 'text',
  primary: 'primary',
  accent: 'accent',
  danger: 'danger',
} as const;

/**
 * One figure with its label. The unit of the dashboard.
 *
 * It takes an already-formatted string rather than a number so the same tile can show a
 * population, a temperature and a percentage without growing a formatting switch.
 */
export function StatTile({
  label,
  value,
  unit,
  icon,
  caption,
  tone = 'default',
  onPress,
  countTo,
  countFormat,
  live = false,
}: StatTileProps) {
  const theme = useTheme();

  const a11yLabel = `${label}: ${value}${unit ?? ''}${caption ? `, ${caption}` : ''}`;

  const tile = (
    <Card
      padding="md"
      elevation="none"
      bordered
      style={{ flex: 1, minWidth: 140 }}
      accessible={!onPress}
      accessibilityLabel={onPress ? undefined : a11yLabel}
    >
      <VStack gap="xs">
        <HStack align="center" gap="sm">
          {icon ? <Icon name={icon} size={13} tone="textMuted" /> : null}
          <Text variant="footnote" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
            {label.toUpperCase()}
          </Text>
          {live ? <LiveDot tone={tone === 'danger' ? 'danger' : 'fresh'} size={7} /> : null}
        </HStack>

        <HStack align="baseline" gap="xxs">
          {countTo === undefined ? (
            <Text variant="metric" style={{ color: theme.colors[TONE_COLORS[tone]] }}>
              {value}
            </Text>
          ) : (
            <AnimatedNumber
              value={countTo}
              format={countFormat}
              variant="metric"
              style={{ color: theme.colors[TONE_COLORS[tone]] }}
            />
          )}
          {unit ? (
            <Text variant="caption" color="textMuted">
              {unit}
            </Text>
          ) : null}
        </HStack>

        {caption ? (
          <Text variant="footnote" color="textMuted" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );

  if (!onPress) return tile;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      style={{ flex: 1, minHeight: 0 }}
    >
      {tile}
    </Pressable>
  );
}
