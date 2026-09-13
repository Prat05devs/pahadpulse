import { Children } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type TypographyToken } from '@/theme';
import { familyFor, platformTextFixes, type FontWeightToken } from '@/theme/fonts';

type ColorToken =
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textMuted'
  | 'textDisabled'
  | 'textInverse'
  | 'textLink'
  | 'primary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type TextProps = RNTextProps & {
  /** Which step of the type ramp. Defaults to body. */
  variant?: TypographyToken;
  /** A token name, never a raw colour. */
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  /** Override the ramp's weight without changing its size. */
  weight?: FontWeightToken;
  /** Tabular digits, so a refreshing figure does not shift its neighbours. */
  tabular?: boolean;
};

/**
 * Flatten children to a string so the right script's font can be chosen.
 *
 * Only the top level is inspected: a nested `<Text>` resolves its own family, which is what
 * makes a mixed-script line render correctly rather than picking one font for the whole run.
 */
function textOf(children: React.ReactNode): string {
  let out = '';
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') out += String(child);
  });
  return out;
}

/**
 * The app's only text primitive. React Native's `Text` is never imported directly by a
 * screen — that is how a stray `fontSize: 14` or an OS-default font gets in.
 *
 * It sets `fontFamily` explicitly and never sets `fontWeight`. See `theme/fonts.ts`: a
 * numeric weight against a bundled font is ignored on Android, so weight has to be carried
 * by the family name instead.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  weight,
  tabular,
  style,
  children,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const ramp = theme.typography[variant];
  const resolvedWeight = weight ?? ramp.weight;

  return (
    <RNText
      allowFontScaling
      style={[
        {
          fontFamily: familyFor(textOf(children), resolvedWeight),
          fontSize: ramp.fontSize,
          lineHeight: ramp.lineHeight,
          color: theme.colors[color],
          ...platformTextFixes,
          ...(align ? { textAlign: align } : null),
          ...(tabular || variant === 'metric'
            ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] }
            : null),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
