import { HStack, Icon, Pressable, Text, type IconName } from '@/components/atoms';
import { HIT_SLOP_MIN_SIZE, useTheme } from '@/theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** `primary` for the one thing the screen wants done; `danger` only for an emergency call. */
  tone?: 'primary' | 'secondary' | 'danger';
  /** Stretch to the row's width instead of hugging the label. */
  block?: boolean;
  accessibilityHint?: string;
};

/**
 * A pill button: Directions, Call 1364, Official page.
 *
 * Kept deliberately plain - one height, three tones - so the handful of actions on a screen
 * read as a set, and a later restyle is one file rather than every screen.
 */
export function ActionButton({
  label,
  onPress,
  icon,
  tone = 'secondary',
  block = false,
  accessibilityHint,
}: ActionButtonProps) {
  const theme = useTheme();
  const background =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.surface;
  const foreground = tone === 'secondary' ? 'text' : 'textInverse';

  return (
    <Pressable
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={{
        minHeight: HIT_SLOP_MIN_SIZE,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: block ? 'stretch' : 'flex-start',
        backgroundColor: background,
        borderWidth: tone === 'secondary' ? 1 : 0,
        borderColor: theme.colors.border,
      }}
    >
      <HStack gap="xs" align="center">
        {icon ? <Icon name={icon} size={17} tone={foreground} /> : null}
        <Text variant="bodyStrong" color={foreground}>
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
}
