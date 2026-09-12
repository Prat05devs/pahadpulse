import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme, type ElevationToken, type RadiusToken, type SpacingToken } from '@/theme';

export type CardProps = ViewProps & {
  padding?: SpacingToken;
  radius?: RadiusToken;
  elevation?: ElevationToken;
  /** A muted card recedes; used for nested blocks inside another card. */
  tone?: 'surface' | 'muted';
  /** Draw a 1px border. Off by default when elevated, since both together reads as heavy. */
  bordered?: boolean;
  children?: ReactNode;
};

/** The standard raised surface. Every panel on every screen is one of these. */
export function Card({
  padding = 'lg',
  radius = 'lg',
  elevation = 'low',
  tone = 'surface',
  bordered,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const showBorder = bordered ?? elevation === 'none';

  return (
    <View
      style={[
        {
          backgroundColor: tone === 'muted' ? theme.colors.surfaceMuted : theme.colors.surface,
          borderRadius: theme.radius[radius],
          padding: theme.spacing[padding],
          ...(showBorder
            ? { borderWidth: 1, borderColor: theme.colors.border }
            : theme.elevation[elevation]),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
