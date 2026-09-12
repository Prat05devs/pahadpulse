import { View } from 'react-native';

import { useTheme, type SpacingToken } from '@/theme';

/** A hairline rule. `inset` indents it to align with text that sits beside an icon. */
export function Divider({ spacing: gap, inset }: { spacing?: SpacingToken; inset?: number }) {
  const theme = useTheme();
  return (
    <View
      // Decorative: announcing "horizontal rule" on every list row is noise in a screen reader.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: gap ? theme.spacing[gap] : 0,
        marginLeft: inset ?? 0,
      }}
    />
  );
}
