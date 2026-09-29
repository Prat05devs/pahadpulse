import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Eyebrow, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { SEVERITY_KEY } from '@/components/molecules';
import { useActiveAlerts } from '@/features/alerts';
import { useDistricts } from '@/features/areas';
import { useTourismGuide } from '@/features/tourism';
import { useT } from '@/i18n';
import { shouldStackCardGrid } from '@/lib/layout';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { alertsForArea, districtSlugByName, highestSeverity, severityTone } from '../model';

const CHAR_DHAM_IMAGE = require('../../../../assets/images/cards/char-dham.webp') as number;

/**
 * The first thing on the home screen after any urgent warning: the app's most useful tool for
 * a traveller, with the four dhams one tap away and the official warning status of each.
 *
 * The status is only ever "a warning of this severity is in force for this dham's district"
 * or "no warning is in force". It never says a route is clear or a trip is safe - the
 * disclaimer under the button says so in words as well.
 */
export function TripHero() {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const language = useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const stackDhams = shouldStackCardGrid(width, fontScale);
  const guide = useTourismGuide();
  const alerts = useActiveAlerts();
  const districts = useDistricts();
  const hero = theme.colors.hero;

  const dhams = guide.data?.charDham ?? [];

  return (
    <View
      style={{ borderRadius: theme.radius.xl, overflow: 'hidden', backgroundColor: hero.end }}
    >
      <Image
        source={CHAR_DHAM_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        cachePolicy="memory-disk"
        transition={180}
        accessible={false}
      />
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="trip-photo-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hero.end} stopOpacity={0.56} />
            <Stop offset="0.48" stopColor={hero.end} stopOpacity={0.76} />
            <Stop offset="1" stopColor={hero.end} stopOpacity={0.96} />
          </LinearGradient>
          <LinearGradient id="trip-photo-tint" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hero.start} stopOpacity={0.34} />
            <Stop offset="1" stopColor={hero.start} stopOpacity={0.06} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#trip-photo-fade)" />
        <Rect width="100%" height="100%" fill="url(#trip-photo-tint)" />
      </Svg>

      <VStack gap="md" padding="lg">
        <HStack align="center" gap="sm">
          <View
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xxs,
              borderRadius: theme.radius.pill,
              backgroundColor: hero.panel,
            }}
          >
            <Eyebrow ink={hero.ink}>{t('home.trip.eyebrow')}</Eyebrow>
          </View>
          {alerts.data && !alerts.isError ? (
            <HStack align="center" gap="xxs">
              <Icon name="radio-outline" size={14} color={hero.statusClear} />
              <Text variant="footnote" style={{ color: hero.statusClear }}>
                {t('home.trip.live')}
              </Text>
            </HStack>
          ) : null}
        </HStack>

        <VStack gap="xs">
          <Text variant="title" style={{ color: hero.ink }}>
            {t('home.trip.title')}
          </Text>
          <Text variant="caption" style={{ color: hero.inkMuted }}>
            {t('home.trip.body')}
          </Text>
        </VStack>

        {dhams.length > 0 ? (
          <VStack gap="sm">
            <Eyebrow weight="bold" ink={hero.inkMuted}>
              {t('home.trip.dhams')}
            </Eyebrow>
            <HStack gap="sm" wrap>
              {dhams.map((place) => {
                const name = language === 'hi' ? place.nameHi : place.name;
                const slug = districtSlugByName(districts.data ?? [], place.district);
                const severity =
                  alerts.data && slug
                    ? highestSeverity(alertsForArea(alerts.data, slug))
                    : null;
                const known = alerts.data !== undefined && slug !== null;
                const tone = known ? severityTone(severity) : null;

                const status = !known
                  ? alerts.isPending || districts.isPending
                    ? '…'
                    : t('home.trip.dham.unknown')
                  : severity
                    ? t('today.warningLevel', { severity: t(SEVERITY_KEY[severity]) })
                    : t('today.noWarning');

                const dot =
                  tone === 'danger'
                    ? hero.statusDanger
                    : tone === 'caution'
                      ? hero.statusCaution
                      : tone === 'clear'
                        ? hero.statusClear
                        : hero.inkMuted;
                const panel =
                  tone === 'danger'
                    ? hero.panelDanger
                    : tone === 'caution'
                      ? hero.panelCaution
                      : hero.panel;

                return (
                  <Pressable
                    key={place.slug}
                    onPress={() =>
                      router.push({ pathname: '/trip-check', params: { to: place.slug } })
                    }
                    accessibilityLabel={t('home.trip.dham.label', { name, status })}
                    style={{
                      width: stackDhams ? '100%' : '47%',
                      flexGrow: 1,
                      minHeight: 52,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      backgroundColor: panel,
                    }}
                  >
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }}
                    />
                    <VStack grow style={{ minWidth: 0 }}>
                      <Text
                        variant="caption"
                        weight="bold"
                        numberOfLines={1}
                        style={{ color: hero.ink }}
                      >
                        {name}
                      </Text>
                      <Text variant="footnote" numberOfLines={1} style={{ color: dot }}>
                        {status}
                      </Text>
                    </VStack>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>
        ) : null}

        <Pressable
          onPress={() => router.push('/trip-check')}
          accessibilityLabel={t('home.trip.cta')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            backgroundColor: hero.ink,
          }}
        >
          <Text variant="bodyStrong" style={{ color: hero.start }}>
            {t('home.trip.cta')}
          </Text>
          <Icon name="arrow-forward" size={20} color={hero.start} />
        </Pressable>

        <Text variant="footnote" align="center" style={{ color: hero.inkMuted }}>
          {t('home.trip.disclaimer')}
        </Text>
      </VStack>
    </View>
  );
}
