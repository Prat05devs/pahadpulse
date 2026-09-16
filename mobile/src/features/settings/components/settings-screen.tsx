import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { Card, Divider, HStack, Pressable, Text, VStack } from '@/components/atoms';
import { Chip, ListRow, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { env } from '@/config/env';
import { useT, type TranslationKey } from '@/i18n';
import { usePreferencesStore, type Language, type ThemeMode } from '@/stores';
import { useTheme } from '@/theme';

const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी', value: 'hi' },
];

const THEMES: { labelKey: TranslationKey; value: ThemeMode }[] = [
  { labelKey: 'settings.theme.system', value: 'system' },
  { labelKey: 'settings.theme.light', value: 'light' },
  { labelKey: 'settings.theme.dark', value: 'dark' },
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
  const t = useT();

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
    Alert.alert(t('settings.reset.confirmTitle'), t('settings.reset.confirmBody'), [
      { text: t('settings.reset.cancel'), style: 'cancel' },
      { text: t('settings.reset.confirm'), style: 'destructive', onPress: reset },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={dismiss}
              accessibilityLabel={t('settings.closeSettings')}
              style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }}
            >
              <Text variant="bodyStrong" color="primary">
                {t('common.done')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <VStack gap="sm">
        <SectionHeader
          title={t('settings.language')}
          subtitle={t('settings.language.subtitle')}
        />
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
            {t('settings.language.note')}
          </Text>
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title={t('settings.appearance')} />
        <Card padding="md">
          <HStack gap="xs" wrap>
            {THEMES.map((option) => (
              <Chip
                key={option.value}
                label={t(option.labelKey)}
                selected={themeMode === option.value}
                onPress={() => setThemeMode(option.value)}
              />
            ))}
          </HStack>
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title={t('settings.yourData')} />
        <Card padding="md">
          <ListRow
            title={t('settings.followed')}
            subtitle={t('settings.followed.subtitle')}
            value={String(savedDistricts.length)}
            showChevron={false}
          />
          <Divider />
          <ListRow
            title={t('settings.reset')}
            subtitle={t('settings.reset.subtitle')}
            icon="trash-outline"
            onPress={confirmReset}
            showChevron={false}
          />
        </Card>
      </VStack>

      <VStack gap="sm">
        <SectionHeader title={t('settings.about')} />
        <Card padding="md">
          <ListRow title={t('settings.version')} value={version} showChevron={false} />
          <Divider />
          <ListRow
            title={t('settings.api')}
            value={env.apiUrl.replace(/^https?:\/\//, '')}
            showChevron={false}
          />
          <Divider />
          <ListRow
            title={t('settings.webPortal')}
            value={env.webUrl.replace(/^https?:\/\//, '')}
            showChevron={false}
          />
          <Divider />
          <ListRow
            title={t('settings.support')}
            subtitle={t('settings.support.subtitle')}
            icon="help-circle-outline"
            onPress={() => void Linking.openURL(`${env.webUrl}/support`)}
          />
          <Divider />
          <ListRow
            title={t('settings.privacy')}
            subtitle={t('settings.privacy.subtitle')}
            icon="shield-checkmark-outline"
            onPress={() => void Linking.openURL(`${env.webUrl}/privacy`)}
          />
        </Card>

        <Card tone="muted" elevation="none">
          <Text variant="caption" color="textMuted">
            {t('settings.disclaimer')}
          </Text>
        </Card>
      </VStack>
    </Screen>
  );
}
