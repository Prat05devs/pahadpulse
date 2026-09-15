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
import { useWindowDimensions } from 'react-native';
import { shouldStackCardGrid } from '@/lib/layout';
import { useTheme } from '@/theme';
import { withAlpha } from '@/theme/tokens';

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
  const { width, fontScale } = useWindowDimensions();
  const stackInGrid = shouldStackCardGrid(width, fontScale);
  const emphasisColor =
    tone === 'default' ? theme.colors.secondary : theme.colors[TONE_COLORS[tone]];

  const a11yLabel = `${label}: ${value}${unit ?? ''}${caption ? `, ${caption}` : ''}`;

  const tile = (
    <Card
      padding="md"
      elevation="none"
      bordered
      style={{
        flex: 1,
        ...(stackInGrid ? { flexBasis: '100%' } : null),
        minWidth: 140,
        borderColor: withAlpha(emphasisColor, theme.scheme === 'dark' ? 0.32 : 0.2),
      }}
      accessible={!onPress}
      accessibilityLabel={onPress ? undefined : a11yLabel}
    >
      <VStack gap="xs">
        <HStack align="center" gap="sm">
          {icon ? (
            <VStack
              align="center"
              justify="center"
              style={{
                width: 26,
                height: 26,
                borderRadius: theme.radius.sm,
                backgroundColor: withAlpha(emphasisColor, theme.scheme === 'dark' ? 0.18 : 0.1),
              }}
            >
              <Icon name={icon} size={14} color={emphasisColor} />
            </VStack>
          ) : null}
          <Text variant="footnote" color="textMuted" style={{ flex: 1, flexShrink: 1 }}>
            {label.toUpperCase()}
          </Text>
          {live ? <LiveDot tone={tone === 'danger' ? 'danger' : 'fresh'} size={7} /> : null}
        </HStack>

        <HStack align="baseline" gap="xxs" wrap>
          {/*
           * One line, shrinking to fit rather than wrapping. Some tiles hold a word
           * ("Highways") rather than a figure, and on a 360dp Android screen a word that does
           * not fit was broken across two lines mid-word — the tile then stood taller than
           * its neighbour. `flexShrink` lets the text measure against the tile, not overflow.
           */}
          {countTo === undefined ? (
            <Text
              variant="metric"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: theme.colors[TONE_COLORS[tone]], flexShrink: 1 }}
            >
              {value}
            </Text>
          ) : (
            <AnimatedNumber
              value={countTo}
              format={countFormat}
              variant="metric"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: theme.colors[TONE_COLORS[tone]], flexShrink: 1 }}
            />
          )}
          {unit ? (
            <Text variant="caption" color="textMuted">
              {unit}
            </Text>
          ) : null}
        </HStack>

        {caption ? (
          <Text variant="footnote" color="textMuted">
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
      style={{ flex: 1, minHeight: 0, ...(stackInGrid ? { flexBasis: '100%' } : null) }}
    >
      {tile}
    </Pressable>
  );
}
