import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type IconProps = {
  name: IconName;
  size?: number;
  /** A token name. Pass `color` only for data encodings that own their own scale. */
  tone?: 'text' | 'textMuted' | 'primary' | 'accent' | 'danger' | 'textInverse';
  color?: string;
};

/**
 * One icon set, wrapped once.
 *
 * Going through this component rather than importing Ionicons directly means swapping icon
 * libraries later is one file, and it keeps icons on theme colours by default.
 */
export function Icon({ name, size = 20, tone = 'text', color }: IconProps) {
  const theme = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? theme.colors[tone]}
      // Icons here always accompany a label, so announcing them doubles the reading.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
