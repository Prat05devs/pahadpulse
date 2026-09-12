import { HStack, Pressable, Spacer, Text, VStack, Icon } from '@/components/atoms';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  /** Renders a trailing "See all" affordance. Omit to leave the header inert. */
  onPressAction?: () => void;
  actionLabel?: string;
};

/** The heading above a block of content. Used on every screen so blocks read consistently. */
export function SectionHeader({
  title,
  subtitle,
  onPressAction,
  actionLabel = 'See all',
}: SectionHeaderProps) {
  return (
    <HStack align="center" gap="sm">
      <VStack grow>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </VStack>
      {onPressAction ? (
        <Pressable
          onPress={onPressAction}
          accessibilityLabel={`${actionLabel}, ${title}`}
          style={{ minHeight: 0 }}
        >
          <HStack align="center" gap="xxs">
            <Text variant="footnote" color="primary">
              {actionLabel}
            </Text>
            <Icon name="chevron-forward" size={14} tone="primary" />
          </HStack>
        </Pressable>
      ) : (
        <Spacer />
      )}
    </HStack>
  );
}
