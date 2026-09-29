import { View } from 'react-native';

import {
  Eyebrow,
  HStack,
  Icon,
  type IconName,
  Pressable,
  Text,
  VStack,
} from '@/components/atoms';
import { useTheme, type TileTone } from '@/theme';

type SignalCardProps = {
  tone: TileTone;
  icon: IconName;
  /** The short category in the pill: "Warnings", "Transit". */
  tag: string;
  value: string;
  label: string;
  caption: string;
  onPress: () => void;
  width: `${number}%`;
};

/**
 * One state signal: a tinted tile whose hue says what kind of signal it is, with the figure
 * large and what it counts beneath it.
 *
 * Flat on purpose (A5 in ANDROID_RELEASE.md): a tinted tile with elevation draws a halo on
 * Android, so depth comes from the tint alone on both platforms.
 */
export function SignalCard({
  tone,
  icon,
  tag,
  value,
  label,
  caption,
  onPress,
  width,
}: SignalCardProps) {
  const theme = useTheme();
  const colors = theme.colors.tile[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}. ${caption}`}
      style={{
        width,
        flexGrow: 1,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
        justifyContent: 'space-between',
        borderRadius: theme.radius.lg,
        backgroundColor: colors.background,
      }}
    >
      <HStack align="center" justify="space-between" gap="xs">
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.md,
            backgroundColor: colors.icon,
          }}
        >
          <Icon name={icon} size={17} color={colors.glyph} />
        </View>
        <View
          style={{
            flexShrink: 1,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xxs,
            borderRadius: theme.radius.pill,
            backgroundColor: colors.pill,
          }}
        >
          <Eyebrow weight="bold" ink={colors.inkMuted} numberOfLines={1}>
            {tag}
          </Eyebrow>
        </View>
      </HStack>

      <VStack gap="xxs">
        <Text variant="title" tabular numberOfLines={1} style={{ color: colors.ink }}>
          {value}
        </Text>
        <Text
          variant="footnote"
          weight="semibold"
          numberOfLines={1}
          style={{ color: colors.inkMuted }}
        >
          {label}
        </Text>
        <Text variant="footnote" numberOfLines={2} style={{ color: colors.inkMuted }}>
          {caption}
        </Text>
      </VStack>
    </Pressable>
  );
}
