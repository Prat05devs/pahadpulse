import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  HStack,
  Icon,
  type IconName,
  LiveDot,
  Pressable,
  Skeleton,
  Text,
} from '@/components/atoms';
import { useAirQuality, type NationalAqiBand } from '@/features/air-quality';
import { useDistricts } from '@/features/areas';
import { CONDITION_ICONS, useAreaWeather } from '@/features/weather';
import { useT } from '@/i18n';
import { formatTime, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme, type Theme } from '@/theme';

type LocationStripProps = {
  /** The district the reader follows first, or '' when they follow none. */
  slug: string;
  /** When the warning feed last answered, in ms. 0 while it never has. */
  updatedAt: number;
  /** False when the last refresh failed and cached data is showing. */
  live: boolean;
};

/** CPCB bands as a traffic light: good air green, the middle amber, poor and worse red. */
function aqiColors(band: NationalAqiBand, theme: Theme) {
  if (band === 'good' || band === 'satisfactory') {
    return { ink: theme.colors.success, fill: theme.colors.successSubtle };
  }
  if (band === 'moderate')
    return { ink: theme.colors.warning, fill: theme.colors.warningSubtle };
  return { ink: theme.colors.danger, fill: theme.colors.dangerMuted };
}

/**
 * The reader's place in the app: which district the screen is about, how current it is, and
 * that district's weather and air right now.
 */
export function LocationStrip({ slug, updatedAt, live }: LocationStripProps) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const language = useLanguage();

  const districts = useDistricts();
  const district = districts.data?.find((entry) => entry.slug === slug);
  const name = district ? localise(district.name, language) : null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <HStack align="center" justify="space-between" gap="sm">
        <Pressable
          onPress={() => router.push('/districts')}
          accessibilityLabel={
            name ? t('today.location.label', { name }) : t('today.location.choose')
          }
          style={{
            flexShrink: 1,
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceInteractive,
          }}
        >
          <Icon name="location" size={16} tone="primary" />
          <Text variant="caption" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name ?? t('today.location.choose')}
          </Text>
          {district?.division ? (
            <Text variant="footnote" color="textMuted" numberOfLines={1}>
              ({district.division})
            </Text>
          ) : null}
          <Icon name="chevron-down" size={14} tone="textMuted" />
        </Pressable>

        {updatedAt > 0 ? (
          <HStack
            align="center"
            gap="xs"
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceMuted,
            }}
          >
            <LiveDot tone="fresh" size={6} active={live} />
            <Text variant="footnote" color={live ? 'success' : 'textMuted'} numberOfLines={1}>
              {t('today.updated', { time: formatTime(new Date(updatedAt)) })}
            </Text>
          </HStack>
        ) : null}
      </HStack>

      {slug ? <ConditionsRibbon slug={slug} /> : null}
    </View>
  );
}

/** Temperature, sky, air quality and humidity for one district, in a single line. */
function ConditionsRibbon({ slug }: { slug: string }) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const weather = useAreaWeather(slug);
  const air = useAirQuality(slug);

  const temperature = weather.data?.temperature;
  const condition = weather.data?.condition;
  const humidity = weather.data?.humidity;
  const aqi = air.data?.nationalAqi ?? null;
  const aqiTone = aqi ? aqiColors(aqi.band, theme) : null;

  // A district without a weather station has nothing to say here; its chip says enough.
  if (!weather.isPending && !temperature && !aqi) return null;

  return (
    <HStack
      align="center"
      justify="space-between"
      gap="sm"
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
      }}
    >
      {weather.isPending ? (
        <Skeleton width={140} height={20} />
      ) : (
        <HStack align="center" gap="sm" style={{ flexShrink: 1 }}>
          <Icon
            name={
              (condition
                ? CONDITION_ICONS[condition.condition]
                : 'thermometer-outline') as IconName
            }
            size={20}
            tone="accent"
          />
          {temperature ? (
            <Text variant="bodyStrong" tabular>{`${Math.round(temperature.value)}°C`}</Text>
          ) : null}
          {condition ? (
            <Text
              variant="caption"
              color="textMuted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {localise(condition.label, language)}
            </Text>
          ) : null}
        </HStack>
      )}

      <HStack align="center" gap="sm">
        {aqi && aqiTone ? (
          <HStack
            align="center"
            gap="xs"
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xxs,
              borderRadius: theme.radius.pill,
              backgroundColor: aqiTone.fill,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: aqiTone.ink,
              }}
            />
            <Text variant="footnote" weight="bold" style={{ color: aqiTone.ink }}>
              {t('today.aqi', { value: Math.round(aqi.value) })}
            </Text>
          </HStack>
        ) : null}
        {humidity ? (
          <Text variant="footnote" color="textMuted">
            {t('today.humidity', { value: Math.round(humidity.value) })}
          </Text>
        ) : null}
      </HStack>
    </HStack>
  );
}
