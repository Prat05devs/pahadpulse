import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme, type SpacingToken } from '@/theme';

type StackProps = ViewProps & {
  /** Space BETWEEN children, from the spacing scale. */
  gap?: SpacingToken;
  padding?: SpacingToken;
  paddingX?: SpacingToken;
  paddingY?: SpacingToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  /** Take the remaining space along the parent's axis. */
  grow?: boolean;
  wrap?: boolean;
  children?: ReactNode;
};

function useStackStyle(
  direction: 'row' | 'column',
  { gap, padding, paddingX, paddingY, align, justify, grow, wrap }: StackProps
): ViewStyle {
  const { spacing } = useTheme();
  return {
    flexDirection: direction,
    ...(gap ? { gap: spacing[gap] } : null),
    ...(padding ? { padding: spacing[padding] } : null),
    ...(paddingX ? { paddingHorizontal: spacing[paddingX] } : null),
    ...(paddingY ? { paddingVertical: spacing[paddingY] } : null),
    ...(align ? { alignItems: align } : null),
    ...(justify ? { justifyContent: justify } : null),
    ...(grow ? { flex: 1 } : null),
    ...(wrap ? { flexWrap: 'wrap' } : null),
  };
}

/**
 * Vertical and horizontal layout primitives.
 *
 * `gap` replaces the margin-on-the-child pattern, so a component never has to know what it
 * sits next to. Spacing comes from the scale, so "a bit more room" is `gap="lg"` rather than
 * someone's guess at 15.
 */
/**
 * Split the layout tokens out of the props before they reach `View`.
 *
 * Without this, `gap`, `padding`, `align` and friends are spread onto the underlying View as
 * unknown component props. They do nothing there — the real values already went into the
 * computed style — but they are noise on every element and a trap for anyone who assumes a
 * prop that is being passed is a prop that is being used.
 */
function splitProps({
  gap,
  padding,
  paddingX,
  paddingY,
  align,
  justify,
  grow,
  wrap,
  children,
  style,
  ...rest
}: StackProps) {
  return {
    layout: { gap, padding, paddingX, paddingY, align, justify, grow, wrap },
    children,
    style,
    rest,
  };
}

export function VStack(props: StackProps) {
  const { layout, children, style, rest } = splitProps(props);
  const base = useStackStyle('column', layout);
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

export function HStack(props: StackProps) {
  const { layout, children, style, rest } = splitProps(props);
  const base = useStackStyle('row', layout);
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

/** Pushes whatever follows it to the far end of a row. */
export function Spacer() {
  return <View style={{ flex: 1 }} />;
}
