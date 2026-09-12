import type { ReactNode } from 'react';

import { HStack, Icon, Pressable, Text, VStack, type IconName } from '@/components/atoms';
import { useTheme } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned value, e.g. a figure or a status word. */
  value?: string;
  icon?: IconName;
  /** Replaces the value slot entirely, for a badge or a switch. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Hide the chevron on a row that is tappable but does not navigate. */
  showChevron?: boolean;
};

/** A single row in a settings list, an indicator table, or a district list. */
export function ListRow({
  title,
  subtitle,
  value,
  icon,
  trailing,
  onPress,
  showChevron = true,
}: ListRowProps) {
  const theme = useTheme();

  const content = (
    <HStack align="center" gap="md" paddingY="md" style={{ minHeight: 52 }}>
      {icon ? <Icon name={icon} size={20} tone="textMuted" /> : null}

      <VStack grow gap="xxs">
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </VStack>

      {trailing ??
        (value ? (
          <Text variant="body" color="textMuted" tabular numberOfLines={1}>
            {value}
          </Text>
        ) : null)}

      {onPress && showChevron ? (
        <Icon name="chevron-forward" size={16} tone="textMuted" />
      ) : null}
    </HStack>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
    >
      {content}
    </Pressable>
  );
}
