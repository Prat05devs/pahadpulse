import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Card, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { useT } from '@/i18n';
import { formatCompact, localise } from '@/lib/format';
import { useIsDistrictSaved, useLanguage, usePreferencesStore } from '@/stores';
import { useTheme } from '@/theme';

import { DISTRICT_IMAGES } from '../district-images';
import type { DistrictSummary } from '../schemas';

type DistrictCardProps = {
  district: DistrictSummary;
  /**
   * Takes the slug rather than closing over it, so the list can pass one stable handler to
   * every row and preserve the memo below while the search value changes.
   */
  onPress: (slug: string) => void;
};

/** An image-led district summary with separate navigation and follow actions. */
export const DistrictCard = memo(function DistrictCard({
  district,
  onPress,
}: DistrictCardProps) {
  const theme = useTheme();
  const language = useLanguage();
  const t = useT();
  const isSaved = useIsDistrictSaved(district.slug);
  const toggleSaved = usePreferencesStore((state) => state.toggleSavedDistrict);

  const name = localise(district.name, language);
  const headquarters = district.headquarters ? localise(district.headquarters, language) : null;
  const districtImage = DISTRICT_IMAGES[district.slug];
  const division =
    district.division?.toLowerCase() === 'garhwal'
      ? t('districts.garhwal')
      : district.division?.toLowerCase() === 'kumaon'
        ? t('districts.kumaon')
        : district.division;
  const tehsilCount = formatCompact(district.counts.tehsils);
  const villageCount = formatCompact(district.counts.villages);

  return (
    <Card padding="xxs" bordered elevation="none" style={{ overflow: 'hidden' }}>
      <Pressable
        onPress={() => onPress(district.slug)}
        accessibilityLabel={t('districts.cardLabelDetailed', {
          name,
          tehsils: tehsilCount,
          villages: villageCount,
        })}
        accessibilityHint={t('districts.openHint')}
        style={{ minHeight: 0 }}
      >
        <View
          style={{
            height: 152,
            overflow: 'hidden',
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primaryStrong,
          }}
        >
          {districtImage ? (
            <Image
              source={districtImage}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={160}
              accessible={false}
            />
          ) : null}

          <Svg
            pointerEvents="none"
            accessible={false}
            style={StyleSheet.absoluteFill}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="district-name-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="45%" stopColor={theme.colors.shadow} stopOpacity={0} />
                <Stop offset="100%" stopColor={theme.colors.shadow} stopOpacity={0.72} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#district-name-fade)" />
          </Svg>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: theme.spacing.md,
              paddingBottom: theme.spacing.sm,
            }}
          >
            <Text
              variant="title"
              numberOfLines={2}
              style={{
                color: theme.colors.hero.ink,
                textShadowColor: theme.colors.shadow,
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {name}
            </Text>
          </View>

          <HStack
            gap="xs"
            align="center"
            style={{
              position: 'absolute',
              left: theme.spacing.sm,
              top: theme.spacing.sm,
            }}
          >
            {division ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.surfaceGlassStrong,
                }}
              >
                <Text variant="footnote" weight="semibold">
                  {t('districts.division', { division })}
                </Text>
              </View>
            ) : null}
            {district.hasBoundary ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.surfaceGlassStrong,
                }}
              >
                <HStack gap="xs" align="center">
                  <Icon name="map-outline" size={13} color={theme.colors.success} />
                  <Text variant="footnote" weight="semibold" color="success">
                    {t('districts.mapped')}
                  </Text>
                </HStack>
              </View>
            ) : null}
          </HStack>
        </View>

        <VStack gap="sm" style={{ padding: theme.spacing.md }}>
          <HStack align="center" gap="sm">
            <HStack align="center" gap="xs">
              <Icon name="layers-outline" size={16} tone="primary" />
              <Text variant="bodyStrong" tabular>
                {tehsilCount}
              </Text>
              <Text variant="caption" color="textMuted">
                {t('districts.tehsils')}
              </Text>
            </HStack>
            <View style={{ width: 1, height: 20, backgroundColor: theme.colors.separator }} />
            <HStack align="center" gap="xs">
              <Icon name="home-outline" size={16} tone="accent" />
              <Text variant="bodyStrong" tabular>
                {villageCount}
              </Text>
              <Text variant="caption" color="textMuted">
                {t('districts.villages')}
              </Text>
            </HStack>
          </HStack>

          <View style={{ height: 1, backgroundColor: theme.colors.separator }} />

          <HStack align="center" gap="xs">
            <Icon name="location-outline" size={16} tone="textMuted" />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              {headquarters
                ? t('districts.headquarters', { name: headquarters })
                : t('districts.headquartersUnknown')}
            </Text>
            <Text variant="bodyStrong" color="primary">
              {t('districts.open')}
            </Text>
            <Icon name="arrow-forward" size={17} tone="primary" />
          </HStack>
        </VStack>
      </Pressable>

      <Pressable
        onPress={() => toggleSaved(district.slug)}
        haptic
        accessibilityRole="button"
        accessibilityState={{ selected: isSaved }}
        accessibilityLabel={
          isSaved ? t('districts.unfollow', { name }) : t('districts.follow', { name })
        }
        style={{
          position: 'absolute',
          right: theme.spacing.sm,
          top: theme.spacing.sm,
          zIndex: 2,
          minHeight: 48,
          minWidth: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceGlassStrong,
        }}
      >
        <Icon
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={21}
          color={isSaved ? theme.colors.primary : theme.colors.text}
        />
      </Pressable>
    </Card>
  );
});
