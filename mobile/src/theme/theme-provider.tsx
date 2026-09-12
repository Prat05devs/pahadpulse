import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useThemeMode } from '@/stores';

import {
  elevation,
  palettes,
  radius,
  spacing,
  typography,
  type ColorScheme,
  type Colors,
} from './tokens';

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
};

function buildTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: palettes[scheme], spacing, radius, typography, elevation };
}

/**
 * Defaulted to light rather than left undefined.
 *
 * A component rendered outside the provider — most often in a test — then styles itself
 * correctly instead of throwing, which keeps unit tests free of provider boilerplate.
 */
const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeMode();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    const scheme: ColorScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return buildTheme(scheme);
  }, [mode, systemScheme]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

/** The only sanctioned way to reach a colour, space or size from a component. */
export function useTheme(): Theme {
  return use(ThemeContext);
}

/**
 * Build a StyleSheet from the theme.
 *
 * Styles depend on the palette, so they cannot be created once at module scope the way a
 * plain `StyleSheet.create` is. This memoises per theme, so switching to dark rebuilds them
 * once rather than on every render.
 *
 * Define the factory at module scope, not inline in the component — an inline arrow is a new
 * function every render, which defeats the memo:
 *
 *   const makeStyles = (t: Theme) => ({ card: { backgroundColor: t.colors.surface } });
 *   // inside the component:
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T extends Record<string, unknown>>(
  factory: (theme: Theme) => T
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
