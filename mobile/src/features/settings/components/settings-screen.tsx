import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { Alert } from 'react-native';

import { Card, Divider, HStack, Pressable, Text, VStack } from '@/components/atoms';
import { Chip, ListRow, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { env } from '@/config/env';
import { usePreferencesStore, type Language, type ThemeMode } from '@/stores';
import { useTheme } from '@/theme';

const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी', value: 'hi' },
];

const THEMES: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

/**
 * Preferences, and the honest facts about where the data comes from.
 *
 * Everything here reads from the Zustand store, which is persisted — so a choice made once
 * survives a cold start, which is the whole reason those four fields are client state rather
 * than server state.
 */
export function SettingsScreen() {
  const theme = useTheme();

  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const savedDistricts = usePreferencesStore((s) => s.savedDistricts);
  const reset = usePreferencesStore((s) => s.reset);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  /**
   * Dismiss to the tab bar rather than calling `router.back()` unconditionally.
   *
   * `back()` does nothing when there is no history — which is exactly the case when this
   * screen was opened from a deep link — leaving the reader tapping a button that appears
   * broken. `canGoBack` is what tells the two situations apart.
   */
  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset preferences?',
      'This clears your language, appearance and followed districts on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: reset },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={dismiss}
              accessibilityLabel="Close settings"
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
            >
              <Text variant="bodyStrong" color="primary">
                Done
              </Text>
            </Pressable>
          ),
        }}
      />
      <VStack gap="sm">
        <SectionHeader title="Language" subtitle="Applies to names and labels from the API" />
        <Card padding="md">
          <HStack gap="xs" wrap>
            {LANGUAGES.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={language === option.value}
                onPress={() => setLanguage(option.value)}
              />
            ))}
          </HStack>
          <Text variant="footnote" color="textMuted" style={{ marginTop: theme.spacing.sm }}>
            Where a source publishes in one language only, that name is shown as published.
          </Text>
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title="Appearance" />
        <Card padding="md">
          <HStack gap="xs" wrap>
            {THEMES.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={themeMode === option.value}
                onPress={() => setThemeMode(option.value)}
              />
            ))}
          </HStack>
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title="Your data" />
        <Card padding="md">
          <ListRow
            title="Followed districts"
            subtitle="Stored on this device only"
            value={String(savedDistricts.length)}
            showChevron={false}
          />
          <Divider />
          <ListRow
            title="Reset preferences"
            subtitle="Clears language, theme and followed districts"
            icon="trash-outline"
            onPress={confirmReset}
            showChevron={false}
          />
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title="About" />
        <Card padding="md">
          <ListRow title="Version" value={version} showChevron={false} />
          <Divider />
          <ListRow title="API" value={env.apiUrl.replace(/^https?:\/\//, '')} showChevron={false} />
          <Divider />
          <ListRow title="Web portal" value={env.webUrl.replace(/^https?:\/\//, '')} showChevron={false} />
        </Card>

        <Card tone="muted" elevation="none">
          <Text variant="caption" color="textMuted">
            Pahad Pulse consolidates data published by Uttarakhand government departments. It
            does not author any figure. Where a source restricts redistribution, its data is
            shown in the app but not exported.
          </Text>
        </Card>
      </VStack>
    </Screen>
  );
}
