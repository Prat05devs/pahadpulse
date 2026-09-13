import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders, AppShell } from '@/components/templates';
import { useTheme } from '@/theme';

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

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="districts/[slug]" options={{ title: '' }} />
        <Stack.Screen name="alerts/[id]" options={{ title: 'Alert' }} />
        <Stack.Screen name="roads" options={{ headerShown: false }} />
        <Stack.Screen name="tourism" options={{ headerShown: false }} />
        <Stack.Screen name="connectivity" options={{ headerShown: false }} />
        <Stack.Screen name="seismic" options={{ headerShown: false }} />
        <Stack.Screen name="air-quality" options={{ headerShown: false }} />
        <Stack.Screen name="compare" options={{ title: 'Compare districts' }} />
        <Stack.Screen name="credits" options={{ title: 'Data credits' }} />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
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
