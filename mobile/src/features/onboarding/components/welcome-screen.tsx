import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HStack, Icon, Pressable, Text, VStack, type IconName } from '@/components/atoms';
import { ActionButton, Chip } from '@/components/molecules';
import { showNotificationEnableFailure, useAlertNotifications } from '@/features/notifications';
import { useT, type TranslationKey } from '@/i18n';
import { useLanguage, usePreferencesStore } from '@/stores';
import { useTheme } from '@/theme';

type Point = { icon: IconName; title: TranslationKey; body: TranslationKey };

const WHY: Point[] = [
  { icon: 'warning-outline', title: 'welcome.why.warnings', body: 'welcome.why.warnings.body' },
  {
    icon: 'shield-checkmark-outline',
    title: 'welcome.why.sources',
    body: 'welcome.why.sources.body',
  },
  {
    icon: 'cloud-offline-outline',
    title: 'welcome.why.offline',
    body: 'welcome.why.offline.body',
  },
];

const TOOLS: Point[] = [
  { icon: 'calendar-outline', title: 'welcome.tools.trip', body: 'welcome.tools.trip.body' },
  { icon: 'car-outline', title: 'welcome.tools.roads', body: 'welcome.tools.roads.body' },
  { icon: 'compass-outline', title: 'welcome.tools.yatra', body: 'welcome.tools.yatra.body' },
  {
    icon: 'briefcase-outline',
    title: 'welcome.tools.business',
    body: 'welcome.tools.business.body',
  },
];

function PointList({ points }: { points: Point[] }) {
  const t = useT();
  const theme = useTheme();
  return (
    <VStack gap="lg">
      {points.map((point) => (
        <HStack key={point.title} gap="md" align="flex-start">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primaryMuted,
            }}
          >
            <Icon name={point.icon} size={20} tone="primary" />
          </View>
          <VStack gap="xxs" grow>
            <Text variant="bodyStrong">{t(point.title)}</Text>
            <Text variant="caption" color="textMuted">
              {t(point.body)}
            </Text>
          </VStack>
        </HStack>
      ))}
    </VStack>
  );
}

/**
 * The first-launch welcome.
 *
 * It exists to answer the question new readers kept asking - "I have the app, now what?" -
 * in three pages: why it is worth having, what you can do with it, and making it yours
 * (language, warning notifications). Shown once; everything here is reachable later.
 */
export function WelcomeScreen() {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useLanguage();
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const markIntroSeen = usePreferencesStore((state) => state.markIntroSeen);
  const notifications = useAlertNotifications();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const pages = 3;

  const finish = (next?: '/trip-check') => {
    markIntroSeen();
    router.back();
    if (next) router.push(next);
  };

  const goTo = (index: number) => {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const pageStyle = {
    width,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + theme.spacing.lg,
      }}
    >
      <HStack justify="flex-end" paddingX="lg" paddingY="sm">
        <Pressable onPress={() => finish()} accessibilityLabel={t('welcome.skip')}>
          <Text variant="bodyStrong" color="textMuted">
            {t('welcome.skip')}
          </Text>
        </Pressable>
      </HStack>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {/* 1. Why */}
        <ScrollView contentContainerStyle={pageStyle} showsVerticalScrollIndicator={false}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.xl,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.brandCanvas,
              borderWidth: 1,
              borderColor: theme.colors.borderSubtle,
            }}
          >
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 54, height: 54 }}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <VStack gap="sm">
            <Text variant="display">{t('welcome.why.title')}</Text>
            <Text variant="body" color="textMuted">
              {t('welcome.why.body')}
            </Text>
          </VStack>
          <PointList points={WHY} />
        </ScrollView>

        {/* 2. What you can do */}
        <ScrollView contentContainerStyle={pageStyle} showsVerticalScrollIndicator={false}>
          <VStack gap="sm">
            <Text variant="display">{t('welcome.tools.title')}</Text>
            <Text variant="body" color="textMuted">
              {t('welcome.tools.body')}
            </Text>
          </VStack>
          <PointList points={TOOLS} />
        </ScrollView>

        {/* 3. Make it yours */}
        <ScrollView contentContainerStyle={pageStyle} showsVerticalScrollIndicator={false}>
          <VStack gap="sm">
            <Text variant="display">{t('welcome.yours.title')}</Text>
            <Text variant="body" color="textMuted">
              {t('welcome.yours.body')}
            </Text>
          </VStack>
          <VStack gap="sm">
            <Text variant="bodyStrong">{t('welcome.yours.language')}</Text>
            <HStack gap="xs">
              <Chip
                label="English"
                selected={language === 'en'}
                onPress={() => setLanguage('en')}
              />
              <Chip
                label="हिन्दी"
                selected={language === 'hi'}
                onPress={() => setLanguage('hi')}
              />
            </HStack>
          </VStack>
          <VStack gap="sm">
            <Text variant="bodyStrong">{t('welcome.yours.alerts')}</Text>
            <Text variant="caption" color="textMuted">
              {t('welcome.yours.alerts.body')}
            </Text>
            <ActionButton
              label={
                notifications.enabled
                  ? t('welcome.yours.alerts.on')
                  : notifications.permission === 'denied'
                    ? t('settings.notifications.blocked')
                    : t('welcome.yours.alerts.turnOn')
              }
              icon={notifications.enabled ? 'notifications' : 'notifications-outline'}
              onPress={() => {
                if (!notifications.enabled && !notifications.busy) {
                  void notifications
                    .enable()
                    .then((result) => showNotificationEnableFailure(result, t));
                }
              }}
            />
          </VStack>
        </ScrollView>
      </ScrollView>

      <VStack gap="md" paddingX="xl">
        <HStack gap="xs" justify="center">
          {Array.from({ length: pages }, (_, index) => (
            <View
              key={index}
              style={{
                width: index === page ? 22 : 8,
                height: 8,
                borderRadius: theme.radius.pill,
                backgroundColor: index === page ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </HStack>
        {page < pages - 1 ? (
          <ActionButton
            label={t('welcome.next')}
            tone="primary"
            block
            onPress={() => goTo(page + 1)}
          />
        ) : (
          <VStack gap="sm">
            <ActionButton
              label={t('welcome.startTrip')}
              icon="calendar-outline"
              tone="primary"
              block
              onPress={() => finish('/trip-check')}
            />
            <ActionButton label={t('welcome.explore')} block onPress={() => finish()} />
          </VStack>
        )}
      </VStack>
    </View>
  );
}
