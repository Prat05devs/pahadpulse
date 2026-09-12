import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

/** A tappable filter. Unlike a Badge, a Chip always does something. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        minHeight: 34,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surface,
      }}
    >
      <Text
        variant="caption"
        weight={selected ? 'semibold' : 'regular'}
        style={{ color: selected ? theme.colors.primary : theme.colors.textMuted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
