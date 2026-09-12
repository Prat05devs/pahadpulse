import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'warning';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** Pass an explicit colour only for data encodings (severity, freshness) that own a scale. */
  color?: string;
  /** A dot instead of a filled pill — for a label that sits next to other text. */
  variant?: 'solid' | 'soft' | 'dot';
};

const TONE_KEYS = {
  neutral: 'textMuted',
  primary: 'primary',
  accent: 'accent',
  danger: 'danger',
  success: 'freshness',
  warning: 'freshness',
} as const;

/** A short status label. Never used for anything tappable — that is a Chip. */
export function Badge({ label, tone = 'neutral', color, variant = 'soft' }: BadgeProps) {
  const theme = useTheme();

  const resolved =
    color ??
    (tone === 'success'
      ? theme.colors.freshness.fresh
      : tone === 'warning'
        ? theme.colors.freshness.stale
        : theme.colors[TONE_KEYS[tone]]);

  if (variant === 'dot') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: theme.radius.pill,
            backgroundColor: resolved,
          }}
        />
        <Text variant="footnote" color="textMuted">
          {label}
        </Text>
      </View>
    );
  }

  const solid = variant === 'solid';

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xxs,
        borderRadius: theme.radius.pill,
        backgroundColor: solid ? resolved : `${resolved}1F`,
      }}
    >
      <Text
        variant="footnote"
        style={{ color: solid ? theme.colors.textInverse : resolved }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
