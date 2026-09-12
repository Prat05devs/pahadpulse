import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

import { fontAssets } from '@/theme/fonts';

// Keep the native splash up until the app can render its first real frame.
void SplashScreen.preventAutoHideAsync();

/**
 * Holds the splash screen until the bundled fonts are in memory.
 *
 * Rendering before they load would draw one frame in the OS default font and then reflow
 * every line once Noto Sans arrives — the flash of unstyled text that makes cards visibly
 * jump on first launch. Waiting is the cheaper trade: the splash is already on screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  /**
   * A font that fails to load is not fatal.
   *
   * `fontError` still counts as ready, so the app renders in the platform default rather
   * than holding a splash screen forever. Slightly wrong metrics beat an app that never
   * opens.
   */
  if (!ready) return null;

  return <>{children}</>;
}
