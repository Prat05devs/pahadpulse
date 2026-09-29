import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Card,
  Eyebrow,
  HStack,
  Icon,
  type IconName,
  Pressable,
  Skeleton,
  Text,
  VStack,
} from '@/components/atoms';
import { SEVERITY_KEY } from '@/components/molecules';
import { useAreaAlerts } from '@/features/alerts';
import { useDistricts } from '@/features/areas';
import { closureCounts, useRoadClosures } from '@/features/roads';
import { CONDITION_ICONS, useAreaWeather } from '@/features/weather';
import { useT } from '@/i18n';
import { formatNumber, formatTime, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { highestSeverity } from '../model';

/** The heading and one card per district the reader follows. */
export function FollowedDistricts({ slugs }: { slugs: string[] }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <VStack gap="sm">
      <HStack align="center" justify="space-between" gap="sm">
        <HStack align="center" gap="xs" style={{ flexShrink: 1 }}>
          <Icon name="bookmarks" size={18} tone="primary" />
          <Text variant="heading" weight="bold" accessibilityRole="header" numberOfLines={1}>
            {t('today.following.title')}
          </Text>
        </HStack>
        <Pressable
          onPress={() => router.push('/districts')}
          accessibilityLabel={`${t('today.following.manage')}, ${t('today.following.title')}`}
          style={{
            minHeight: 36,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceInteractive,
          }}
        >
          <Text variant="footnote" weight="bold" color="primary">
            {t('today.following.count', { count: slugs.length })}
          </Text>
        </Pressable>
      </HStack>
      {slugs.map((slug) => (
        <FollowedDistrictCard key={slug} slug={slug} />
      ))}
    </VStack>
  );
}

/**
 * One followed district: its warning level, current weather and road status.
 *
 * Each card owns its queries, so one slow station or a failing feed affects only its own
 * card rather than holding back the whole list.
 */
function FollowedDistrictCard({ slug }: { slug: string }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const language = useLanguage();

  const districts = useDistricts();
  const weather = useAreaWeather(slug);
  const alerts = useAreaAlerts(slug);
  const roads = useRoadClosures(slug);

  const district = districts.data?.find((entry) => entry.slug === slug);
  const name = district ? localise(district.name, language) : slug.replace(/-/g, ' ');
  // The other script in brackets, as the district is written on its own signboards.
  const otherName = district ? (language === 'hi' ? district.name.en : district.name.hi) : null;
  const initial = Array.from(name)[0]?.toUpperCase() ?? '';

  const severity = alerts.data ? highestSeverity(alerts.data) : null;
  const temperature = weather.data?.temperature;
  const condition = weather.data?.condition;
  const rainfall = weather.data?.rainfall;
  const roadCounts = roads.data?.available ? closureCounts(roads.data) : null;
  const firstClosed = roads.data?.closures[0];

  const weatherLine = temperature
    ? [
        `${Math.round(temperature.value)}°C`,
        condition ? localise(condition.label, language) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('districts.noStation');
  const weatherCaption =
    rainfall && rainfall.value > 0
      ? t('today.district.rain', { value: formatNumber(rainfall.value, 1) })
      : weather.data?.observedAt
        ? formatTime(weather.data.observedAt)
        : ' ';

  const road: {
    icon: IconName;
    tone: 'danger' | 'success' | 'textMuted';
    title: string;
    caption: string;
  } =
    roadCounts === null
      ? {
          icon: 'call-outline',
          tone: 'textMuted',
          title: t('today.district.roads'),
          caption: t('home.signal.roads.helpline'),
        }
      : roadCounts.closed > 0
        ? {
            icon: 'close-circle',
            tone: 'danger',
            title: t('today.district.roadsClosed', { count: roadCounts.closed }),
            caption: firstClosed?.roadName ?? ' ',
          }
        : {
            icon: 'checkmark-circle',
            tone: 'success',
            title: t('today.district.roadsClear'),
            caption: roads.data?.checkedAt ? formatTime(roads.data.checkedAt) : ' ',
          };

  const warning = alerts.data
    ? severity
      ? {
          label: t('today.warningLevel', { severity: t(SEVERITY_KEY[severity]) }),
          ink: theme.colors.severity[severity],
          fill: theme.colors.severitySubtle[severity],
        }
      : {
          label: t('today.noWarning'),
          ink: theme.colors.success,
          fill: theme.colors.successSubtle,
        }
    : null;

  const source = weather.data?.source
    ? localise(weather.data.source.department, language)
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/districts/${slug}`)}
      accessibilityLabel={[name, warning?.label, weatherLine, road.title]
        .filter(Boolean)
        .join('. ')}
      accessibilityHint={t('today.district.open', { name })}
      style={{ minHeight: 0 }}
    >
      <Card radius="xl" padding="lg" style={{ gap: theme.spacing.md }}>
        <HStack align="center" gap="sm">
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surfaceInteractive,
            }}
          >
            <Text variant="heading" weight="bold" color="primary">
              {initial}
            </Text>
          </View>
          <VStack grow style={{ minWidth: 0 }}>
            <HStack align="center" gap="xs">
              <Text variant="heading" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
              {otherName ? (
                <Text variant="footnote" color="textMuted" numberOfLines={1}>
                  ({otherName})
                </Text>
              ) : null}
            </HStack>
            {district?.division ? (
              <Text variant="footnote" color="textMuted" numberOfLines={1}>
                {t('districts.division', { division: district.division })}
              </Text>
            ) : null}
          </VStack>
          {warning ? (
            <HStack
              align="center"
              gap="xs"
              style={{
                flexShrink: 1,
                maxWidth: '42%',
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xxs,
                borderRadius: theme.radius.pill,
                backgroundColor: warning.fill,
              }}
            >
              <View
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: warning.ink }}
              />
              <Eyebrow
                weight="bold"
                ink={warning.ink}
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {warning.label}
              </Eyebrow>
            </HStack>
          ) : alerts.isPending ? (
            <Skeleton width={72} height={20} />
          ) : null}
        </HStack>

        <HStack
          gap="sm"
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <HStack grow align="center" gap="sm" style={{ minWidth: 0 }}>
            <Icon
              name={
                (condition
                  ? CONDITION_ICONS[condition.condition]
                  : 'thermometer-outline') as IconName
              }
              size={20}
              tone="primary"
            />
            {weather.isPending ? (
              <Skeleton width={80} height={32} />
            ) : (
              <VStack grow style={{ minWidth: 0 }}>
                <Text variant="caption" weight="bold" numberOfLines={1}>
                  {weatherLine}
                </Text>
                <Text variant="footnote" color="textMuted" numberOfLines={1}>
                  {weatherCaption}
                </Text>
              </VStack>
            )}
          </HStack>
          <HStack grow align="center" gap="sm" style={{ minWidth: 0 }}>
            <Icon name={road.icon} size={20} color={theme.colors[road.tone]} />
            {roads.isPending ? (
              <Skeleton width={80} height={32} />
            ) : (
              <VStack grow style={{ minWidth: 0 }}>
                <Text variant="caption" weight="bold" numberOfLines={1}>
                  {road.title}
                </Text>
                <Text
                  variant="footnote"
                  color={road.tone === 'danger' ? 'danger' : 'textMuted'}
                  numberOfLines={1}
                >
                  {road.caption}
                </Text>
              </VStack>
            )}
          </HStack>
        </HStack>

        <HStack align="center" justify="space-between" gap="sm">
          <Text
            variant="footnote"
            color="textMuted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {source ?? ' '}
          </Text>
          <HStack align="center" gap="xxs">
            <Text variant="footnote" weight="bold" color="primary" numberOfLines={1}>
              {t('today.district.open', { name })}
            </Text>
            <Icon name="arrow-forward" size={14} tone="primary" />
          </HStack>
        </HStack>
      </Card>
    </Pressable>
  );
}
