import type { TextStyle } from 'react-native';

import { containsDevanagari } from '@/theme/fonts';

import { Text, type TextProps } from './text';

type EyebrowProps = Omit<TextProps, 'variant' | 'children'> & {
  children: string;
  /** A raw colour, for eyebrows drawn on a surface that owns its own ink (hero, tiles). */
  ink?: string;
};

/**
 * The small spaced label above a heading or inside a pill: "URGENT WARNING", "CHAR DHAM".
 *
 * Tracking and upper case are applied only to Latin text. Devanagari has no case, and letter
 * spacing pulls the conjuncts and matras of a Hindi word apart - on Android it visibly breaks
 * the headline stroke that joins the letters.
 */
export function Eyebrow({ children, ink, style, weight = 'semibold', ...rest }: EyebrowProps) {
  const latin = !containsDevanagari(children);
  const tracking: TextStyle | null = latin ? { letterSpacing: 0.6 } : null;

  return (
    <Text
      variant="footnote"
      weight={weight}
      style={[tracking, ink ? { color: ink } : null, style]}
      {...rest}
    >
      {latin ? children.toUpperCase() : children}
    </Text>
  );
}
