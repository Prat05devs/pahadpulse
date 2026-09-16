import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AppProviders, AppShell } from '@/components/templates';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/fonts';

/**
 * Anchor every route to the tab bar.
 *
 * Without this, opening a deep link such as `pahadpulse://settings` — or a push notification,
 * or a link shared from the web portal — makes that screen the FIRST entry in the stack.
 * There is nothing beneath it to go back to, so no back button is drawn and the reader is
 * stranded on a screen with no way out. Naming the initial route means a deep link is always
 * pushed on top of the tabs instead.
 */
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

/**
 * The root layout. Routing and providers only — no screen ever lives in `src/app`.
 */
function RootNavigator() {
  const theme = useTheme();
  const t = useT();

  /*
   * The native window behind every screen. It defaults to white, and Android reveals it
   * during screen transitions and while the keyboard resizes the window — a white flash on
   * every push in dark mode. Kept in step with the theme rather than set once in config,
   * because the reader can switch theme at runtime.
   */
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          // The native header is not a Text atom, so its font and alignment are pinned here.
          // Left alone it renders Roboto, left-aligned, on Android and San Francisco,
          // centred, on iOS — every pushed screen looked like a different app.
          headerTitleStyle: { fontFamily: fontFamily.semibold },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackTitle: t('nav.back'),
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('nav.home') }} />
        <Stack.Screen name="districts/[slug]" options={{ title: '' }} />
        <Stack.Screen name="alerts/[id]" options={{ title: t('nav.alert') }} />
        <Stack.Screen name="roads" options={{ title: t('nav.roads') }} />
        <Stack.Screen name="tourism" options={{ title: t('nav.tourism') }} />
        <Stack.Screen name="connectivity" options={{ title: t('nav.connectivity') }} />
        <Stack.Screen name="seismic" options={{ title: t('nav.seismic') }} />
        <Stack.Screen name="air-quality" options={{ title: t('nav.airQuality') }} />
        <Stack.Screen name="compare" options={{ title: t('nav.compare') }} />
        <Stack.Screen name="credits" options={{ title: t('nav.credits') }} />
        <Stack.Screen
          name="settings"
          options={{
            title: t('nav.settings'),
            presentation: 'modal',
            // A modal has no back button of its own — iOS relies on a swipe-down gesture
            // that is invisible and undiscoverable. The screen draws its own Done button.
            headerBackVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppShell>
        <RootNavigator />
      </AppShell>
    </AppProviders>
  );
}
