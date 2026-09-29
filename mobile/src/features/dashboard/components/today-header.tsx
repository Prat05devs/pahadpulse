import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, HStack, Icon, LiveDot, Pressable, Text, VStack } from '@/components/atoms';
import { useAlertSummary } from '@/features/alerts';
import { useT } from '@/i18n';
import { useLanguage, usePreferencesStore, type Language } from '@/stores';
import { useTheme } from '@/theme';

/** Each language is named in itself, so a reader can find theirs whichever is showing. */
const ENDONYM: Record<Language, string> = { en: 'EN', hi: 'हिन्दी' };
const ENDONYM_FULL: Record<Language, string> = { en: 'English', hi: 'हिन्दी' };

/** Below this width the state tag beside the name would squeeze the controls. */
const STATE_TAG_MIN_WIDTH = 400;

/**
 * The pinned bar above the Today screen: identity, whether the data is live, and the language
 * and settings controls a reader may need from anywhere on the page.
 */
export function TodayHeader() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const t = useT();
  const language = useLanguage();
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const summary = useAlertSummary();

  // "Live" only once the warning feed has answered this session. Cached data shown after a
  // failed refresh is labelled as saved, and its dot stops pulsing.
  const live = summary.data !== undefined && !summary.isError;
  const other: Language = language === 'en' ? 'hi' : 'en';

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.xs,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.separator,
      }}
    >
      <HStack align="center" gap="sm">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.md,
            // The logo's own colours need a light canvas in the dark theme too.
            backgroundColor: theme.colors.brandCanvas,
          }}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <VStack
          grow
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${t('today.headerLabel')}. ${live ? t('today.live') : t('today.offline')}`}
          style={{ minWidth: 0 }}
        >
          <HStack align="center" gap="xs">
            <Text variant="heading" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t('today.brandName')}
            </Text>
            {width >= STATE_TAG_MIN_WIDTH ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.xs + 2,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.primaryMuted,
                }}
              >
                <Text variant="footnote" color="primary">
                  {t('today.stateTag')}
                </Text>
              </View>
            ) : null}
          </HStack>
          <HStack align="center" gap="xs">
            <LiveDot tone="fresh" size={6} active={live} />
            <Eyebrow
              color={live ? 'success' : 'textMuted'}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {live ? t('today.live') : t('today.offline')}
            </Eyebrow>
          </HStack>
        </VStack>

        <Pressable
          onPress={() => setLanguage(other)}
          accessibilityLabel={t('today.language.label', { language: ENDONYM_FULL[other] })}
          style={{
            minHeight: 40,
            paddingHorizontal: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceInteractive,
          }}
        >
          {(['en', 'hi'] as const).map((code, index) => (
            <HStack key={code} align="center" gap="xs">
              {index > 0 ? (
                <Text variant="footnote" color="textDisabled">
                  |
                </Text>
              ) : null}
              <Text
                variant="footnote"
                weight={code === language ? 'bold' : 'medium'}
                color={code === language ? 'primary' : 'textMuted'}
              >
                {ENDONYM[code]}
              </Text>
            </HStack>
          ))}
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel={t('today.openSettings')}
          accessibilityHint={t('today.openSettings.hint')}
          style={{
            width: 36,
            minHeight: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.actionPrimary,
          }}
        >
          <Icon name="settings-sharp" size={18} tone="textInverse" />
        </Pressable>
      </HStack>
    </View>
  );
}
