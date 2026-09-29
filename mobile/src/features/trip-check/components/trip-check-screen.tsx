import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import {
  Card,
  Eyebrow,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
  type IconName,
} from '@/components/atoms';
import {
  ActionButton,
  Chip,
  LoadingState,
  SectionHeader,
  SelectField,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { EMERGENCY_NUMBER } from '@/config/constants';
import { AlertCard, useAreaAlerts, type Alert } from '@/features/alerts';
import { useDistricts } from '@/features/areas';
import { useAreaNetwork } from '@/features/connectivity';
import { RoadClosuresPanel, useRoadClosures } from '@/features/roads';
import { useTourismGuide, type TourismGuide } from '@/features/tourism';
import { CONDITION_ICONS, useAreaWeather, type WeatherData } from '@/features/weather';
import { useT } from '@/i18n';
import { callNumber, openDirections, openExternal } from '@/lib/external-link';
import { formatNumber, formatTime, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';
import { withAlpha } from '@/theme/tokens';

import {
  HEAVY_RAIN_LEVELS,
  alertCoverage,
  destinationOptions,
  istDate,
  normaliseTravelDate,
  rainfallCategory,
  resolveDestination,
  shortDateLabel,
  travelDates,
  type Destination,
} from '../model';

type TripCheckScreenProps = {
  initialTo?: string;
  initialDate?: string;
};

type GlanceTone = 'danger' | 'success' | 'warning' | 'neutral' | 'info';

function GlanceTile({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  tone: GlanceTone;
}) {
  const theme = useTheme();
  const color =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'success'
        ? theme.colors.success
        : tone === 'warning'
          ? theme.colors.warning
          : tone === 'info'
            ? theme.colors.primary
            : theme.colors.textMuted;
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        minWidth: 140,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.3),
        backgroundColor: withAlpha(color, theme.scheme === 'dark' ? 0.16 : 0.08),
        gap: theme.spacing.xxs,
      }}
    >
      <HStack gap="xs" align="center">
        <Icon name={icon} size={15} color={color} />
        <Text variant="footnote" color="textMuted">
          {label.toUpperCase()}
        </Text>
      </HStack>
      <Text variant="heading" tabular>
        {value}
      </Text>
      <Text variant="footnote" color="textMuted">
        {detail}
      </Text>
    </View>
  );
}

function ReportSection({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <VStack gap="sm">
      <HStack gap="sm" align="center">
        <Icon name={icon} tone="primary" />
        <Text variant="heading">{title}</Text>
      </HStack>
      {children}
    </VStack>
  );
}

/** The report for one destination on one date. Every signal loads and fails independently. */
function TripReport({
  destination,
  travelDate,
  onChangeDate,
  guide,
  checkedAt,
}: {
  destination: Destination;
  travelDate: string;
  onChangeDate: (date: string) => void;
  guide: TourismGuide | null;
  checkedAt: Date;
}) {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const language = useLanguage();
  const { fontScale } = useWindowDimensions();
  // The date chips hold footnote figures ("12.5 mm"); a fixed width wraps them at larger
  // system font sizes, most visibly in Noto Sans on Android.
  const dayChipWidth = 70 * Math.min(fontScale, theme.typography.footnote.maxFontScale);
  const slug = destination.district.slug;

  const alerts = useAreaAlerts(slug);
  const weather = useAreaWeather(slug);
  const network = useAreaNetwork(slug);
  const roads = useRoadClosures(slug);

  const isToday = travelDate === istDate(checkedAt);
  const place = destination.kind === 'place' ? destination.place : null;
  const altitudeM = place !== null && 'altitudeM' in place ? place.altitudeM : null;

  // `null` means the request failed - never the same thing as "no warnings".
  const alertList: Alert[] | null = alerts.isError ? null : (alerts.data ?? []);
  const inForce = (alertList ?? []).filter(
    (a) => alertCoverage(a, travelDate) === 'covers-date'
  );
  const notOnDate = (alertList ?? []).filter(
    (a) => alertCoverage(a, travelDate) !== 'covers-date'
  );
  const [showOthers, setShowOthers] = useState(false);

  const weatherData: WeatherData | undefined = weather.data;
  const forecast = weatherData?.forecast ?? [];
  const day = forecast.find((entry) => entry.date === travelDate) ?? null;
  const rain = rainfallCategory(day?.precipitationMm ?? null);
  const heavy = rain !== null && HEAVY_RAIN_LEVELS.has(rain.level);
  const mobile = network.data?.connections.find((c) => c.kind === 'mobile') ?? null;
  const dates = new Set(travelDates(checkedAt).map((d) => d.value));
  const strip = forecast.filter((entry) => dates.has(entry.date));
  const registration = guide?.officialLinks.find((link) => link.kind === 'primary') ?? null;
  const openAlert = (id: number) => router.push(`/alerts/${id}`);

  const temperature =
    day?.minTemperatureC != null && day.maxTemperatureC != null
      ? `${Math.round(day.minTemperatureC)}°–${Math.round(day.maxTemperatureC)}°`
      : t('common.notAvailable');

  return (
    <VStack gap="xl">
      {/* Where and when */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {place !== null ? (
          <View>
            <Image
              source={{ uri: place.imageUrl }}
              style={{ width: '100%', height: 190, backgroundColor: theme.colors.surfaceMuted }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
            <View
              style={{
                position: 'absolute',
                top: theme.spacing.md,
                left: theme.spacing.md,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.scrim,
              }}
            >
              <Eyebrow ink={theme.colors.hero.statusClear}>
                {isToday ? t('trip.activeNow') : shortDateLabel(travelDate)}
              </Eyebrow>
            </View>
          </View>
        ) : null}
        <VStack gap="xs" padding="lg">
          <Text variant="footnote" color="primary" weight="semibold">
            {(isToday ? `${t('trip.today')} · ` : '') + shortDateLabel(travelDate)}
          </Text>
          <Text variant="title">{destination.name}</Text>
          <HStack gap="md" wrap>
            <HStack gap="xxs" align="center">
              <Icon name="location-outline" size={14} tone="textMuted" />
              <Text variant="caption" color="textMuted">
                {t('trip.districtOf', { district: destination.district.name })}
              </Text>
            </HStack>
            {altitudeM !== null ? (
              <HStack gap="xxs" align="center">
                <Icon name="triangle-outline" size={14} tone="textMuted" />
                <Text variant="caption" color="textMuted">
                  {formatNumber(altitudeM)} m
                </Text>
              </HStack>
            ) : null}
          </HStack>
          <HStack gap="xs" wrap style={{ marginTop: theme.spacing.sm }}>
            {place !== null ? (
              <>
                <ActionButton
                  label={t('guide.directions')}
                  icon="navigate-outline"
                  tone="primary"
                  onPress={() => void openDirections(place.mapDestination)}
                />
                <ActionButton
                  label={t('guide.officialGuide')}
                  icon="open-outline"
                  onPress={() => void openExternal(place.officialUrl)}
                />
              </>
            ) : null}
            <ActionButton
              label={t('trip.openDistrict')}
              icon="map-outline"
              tone={place === null ? 'primary' : 'secondary'}
              onPress={() => router.push(`/districts/${slug}`)}
            />
          </HStack>
        </VStack>
      </Card>

      {/* At a glance */}
      <VStack gap="md">
        <SectionHeader
          title={t('trip.glance.title')}
          subtitle={t('trip.glance.subtitle', { time: formatTime(checkedAt) })}
        />
        <HStack gap="sm" wrap>
          <GlanceTile
            icon="warning-outline"
            label={t('trip.glance.warnings')}
            value={
              alerts.isPending
                ? '…'
                : alertList === null
                  ? t('trip.unavailable')
                  : String(inForce.length)
            }
            detail={
              alertList === null
                ? t('trip.couldNotCheck')
                : isToday
                  ? t('trip.inForceToday')
                  : t('trip.validOnDate')
            }
            tone={
              alertList === null || inForce.length > 0
                ? 'danger'
                : isToday
                  ? 'success'
                  : 'neutral'
            }
          />
          <GlanceTile
            icon="rainy-outline"
            label={t('trip.glance.rain')}
            value={rain ? t(rain.label) : t('common.notAvailable')}
            detail={
              day?.precipitationMm != null
                ? t('trip.mmIn24h', { mm: day.precipitationMm })
                : t('trip.noForecast')
            }
            tone={heavy ? 'warning' : 'info'}
          />
          <GlanceTile
            icon="thermometer-outline"
            label={t('trip.glance.temperature')}
            value={temperature}
            detail={
              day?.condition ? localise(day.condition.label, language) : t('trip.noForecast')
            }
            tone="neutral"
          />
          <GlanceTile
            icon="cellular-outline"
            label={t('trip.glance.signal')}
            value={
              mobile === null
                ? t('common.notAvailable')
                : `${formatNumber(mobile.downloadMbps)} Mbps`
            }
            detail={mobile === null ? t('trip.notMeasured') : t('trip.districtAverage')}
            tone="neutral"
          />
        </HStack>
      </VStack>

      {/* 1. Official warnings */}
      <ReportSection icon="warning-outline" title={t('trip.warnings.title')}>
        {alerts.isPending ? (
          <LoadingState label={t('today.alerts.loading')} />
        ) : alertList === null ? (
          <Card tone="warning" elevation="none">
            <VStack gap="xs">
              <Text variant="bodyStrong">{t('trip.warnings.failed')}</Text>
              <Text variant="caption">{t('trip.warnings.failed.body')}</Text>
              <ActionButton
                label="NDMA SACHET"
                icon="open-outline"
                onPress={() => void openExternal('https://sachet.ndma.gov.in/')}
              />
            </VStack>
          </Card>
        ) : inForce.length === 0 ? (
          // Green only for today. For a later date "none yet" is weak evidence: warnings are
          // usually issued close to the day, so it must not read as reassurance.
          <Card tone="muted" elevation="none">
            <HStack gap="sm" align="flex-start">
              <Icon
                name="checkmark-circle-outline"
                color={isToday ? theme.colors.success : theme.colors.textMuted}
              />
              <VStack gap="xxs" grow>
                <Text variant="bodyStrong">
                  {isToday
                    ? t('trip.warnings.noneToday', { district: destination.district.name })
                    : t('trip.warnings.noneOnDate', { district: destination.district.name })}
                </Text>
                <Text variant="caption" color="textMuted">
                  {t('trip.warnings.noneBody', { time: formatTime(checkedAt) })}
                </Text>
              </VStack>
            </HStack>
          </Card>
        ) : (
          <VStack gap="sm">
            <Text variant="caption" color="textMuted">
              {t('trip.warnings.count', {
                count: inForce.length,
                district: destination.district.name,
              })}
            </Text>
            {inForce.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onPress={openAlert} />
            ))}
          </VStack>
        )}
        {notOnDate.length > 0 ? (
          <Card tone="muted" elevation="none" padding="md">
            <Pressable
              onPress={() => setShowOthers((open) => !open)}
              accessibilityState={{ expanded: showOthers }}
              style={{ minHeight: 0 }}
            >
              <HStack gap="sm" align="center">
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {t('trip.warnings.others', { count: notOnDate.length })}
                </Text>
                <Icon name={showOthers ? 'chevron-up' : 'chevron-down'} tone="textMuted" />
              </HStack>
            </Pressable>
            {showOthers ? (
              <VStack gap="sm" style={{ marginTop: theme.spacing.md }}>
                <Text variant="caption" color="textMuted">
                  {t('trip.warnings.othersBody')}
                </Text>
                {notOnDate.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onPress={openAlert} />
                ))}
              </VStack>
            ) : null}
          </Card>
        ) : null}
      </ReportSection>

      {/* 2. Forecast */}
      <ReportSection icon="partly-sunny-outline" title={t('trip.weather.title')}>
        <Card padding="md">
          <VStack gap="md">
            {weather.isPending ? (
              <LoadingState label={t('trip.weather.loading')} />
            ) : day === null ? (
              <Text variant="caption" color="textMuted">
                {t('trip.weather.none')}
              </Text>
            ) : (
              <HStack gap="xl" wrap align="center">
                <HStack gap="sm" align="center">
                  <Icon
                    name={
                      (day.condition
                        ? CONDITION_ICONS[day.condition.condition]
                        : 'thermometer-outline') as IconName
                    }
                    size={34}
                    tone="primary"
                  />
                  <VStack>
                    <Text variant="metric" tabular>
                      {temperature}C
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {day.condition ? localise(day.condition.label, language) : ''}
                    </Text>
                  </VStack>
                </HStack>
                <VStack>
                  <Text variant="metric" tabular>
                    {day.precipitationMm === null
                      ? t('common.notAvailable')
                      : `${day.precipitationMm} mm`}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {t('trip.weather.rain24')}
                  </Text>
                </VStack>
              </HStack>
            )}
            {rain !== null ? (
              <Card tone={heavy ? 'warning' : 'muted'} elevation="none" padding="sm">
                <Text variant="caption">
                  {t('trip.weather.imd', { label: t(rain.label) })}
                  {heavy ? ` ${t('trip.weather.heavyNote')}` : ''}
                </Text>
              </Card>
            ) : null}
            {strip.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack gap="xs">
                  {strip.map((entry) => {
                    const selected = entry.date === travelDate;
                    const wet = (entry.precipitationMm ?? 0) >= 2.5;
                    return (
                      <Pressable
                        key={entry.date}
                        onPress={() => onChangeDate(entry.date)}
                        accessibilityState={{ selected }}
                        accessibilityLabel={shortDateLabel(entry.date)}
                        style={{
                          width: dayChipWidth,
                          alignItems: 'center',
                          gap: 4,
                          paddingVertical: theme.spacing.md,
                          borderRadius: theme.radius.lg,
                          borderWidth: 1,
                          borderColor: selected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: selected
                            ? theme.colors.primaryMuted
                            : theme.colors.surface,
                        }}
                      >
                        <Text variant="footnote" weight="semibold">
                          {shortDateLabel(entry.date).replace(/ \w+$/, '')}
                        </Text>
                        <Icon
                          name={
                            (entry.condition
                              ? CONDITION_ICONS[entry.condition.condition]
                              : 'cloud-outline') as IconName
                          }
                          size={18}
                          tone="primary"
                        />
                        <Text variant="footnote" tabular>
                          {entry.maxTemperatureC !== null
                            ? `${Math.round(entry.maxTemperatureC)}°`
                            : t('common.notAvailable')}
                          {entry.minTemperatureC !== null
                            ? ` ${Math.round(entry.minTemperatureC)}°`
                            : ''}
                        </Text>
                        <Text variant="footnote" color={wet ? 'primary' : 'textMuted'} tabular>
                          {entry.precipitationMm !== null
                            ? `${entry.precipitationMm} mm`
                            : t('common.notAvailable')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </ScrollView>
            ) : null}
            <Text variant="footnote" color="textMuted">
              {t('trip.weather.source', {
                station: weatherData
                  ? localise(weatherData.station.name, language)
                  : destination.district.name,
                source: weatherData?.source
                  ? localise(weatherData.source.department, language)
                  : t('common.notAvailable'),
              })}
              {altitudeM !== null
                ? ` ${t('trip.weather.altitude', { place: destination.name, altitude: formatNumber(altitudeM) })}`
                : ''}
            </Text>
          </VStack>
        </Card>
      </ReportSection>

      {/* 3. Roads */}
      <ReportSection icon="car-outline" title={t('roads.closures.title')}>
        {roads.isPending ? (
          <LoadingState label={t('roads.closures.loading')} />
        ) : (
          <RoadClosuresPanel
            report={roads.data ?? null}
            limit={5}
            onSeeAll={() => router.push({ pathname: '/roads', params: { district: slug } })}
            showDistrict={false}
            scopeLabel={t('trip.districtOf', { district: destination.district.name })}
          />
        )}
        {registration !== null ? (
          <ActionButton
            label={registration.label}
            icon="shield-checkmark-outline"
            onPress={() => void openExternal(registration.url)}
          />
        ) : null}
      </ReportSection>

      {/* 4. Mobile signal */}
      <ReportSection icon="cellular-outline" title={t('trip.signal.title')}>
        <Card padding="md">
          <VStack gap="sm">
            {network.isPending ? (
              <LoadingState label={t('trip.signal.loading')} />
            ) : network.isError ? (
              <Text variant="caption" color="textMuted">
                {t('trip.signal.failed')}
              </Text>
            ) : mobile === null ? (
              <Text variant="caption" color="textMuted">
                {t('trip.signal.none', { district: destination.district.name })}
              </Text>
            ) : (
              <HStack gap="xl">
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    {t('trip.signal.download')}
                  </Text>
                  <Text variant="metric" tabular>
                    {formatNumber(mobile.downloadMbps, 1)} Mbps
                  </Text>
                </VStack>
                <VStack>
                  <Text variant="footnote" color="textMuted">
                    {t('trip.signal.latency')}
                  </Text>
                  <Text variant="metric" tabular>
                    {formatNumber(mobile.latencyMs)} ms
                  </Text>
                </VStack>
              </HStack>
            )}
            {mobile?.sample.strength === 'thin' ? (
              <Text variant="footnote" color="warning">
                {t('trip.signal.thin')}
              </Text>
            ) : null}
            <Text variant="footnote" color="textMuted">
              {t('trip.signal.note')}
            </Text>
          </VStack>
        </Card>
      </ReportSection>

      {/* 5. Help */}
      <ReportSection icon="call-outline" title={t('trip.help.title')}>
        <Card tone="muted" elevation="none">
          <VStack gap="sm">
            <Text variant="footnote" color="textMuted">
              {t('guide.help.yatra')}
            </Text>
            <HStack gap="xs" wrap>
              {(guide?.helplines.yatra ?? ['1364']).map((number) => (
                <ActionButton
                  key={number}
                  label={number}
                  icon="call-outline"
                  onPress={() => void callNumber(number)}
                />
              ))}
            </HStack>
            <Text variant="footnote" color="textMuted">
              {t('guide.help.emergency')}
            </Text>
            <ActionButton
              label={guide?.helplines.emergency ?? EMERGENCY_NUMBER}
              icon="call"
              tone="danger"
              onPress={() => void callNumber(guide?.helplines.emergency ?? EMERGENCY_NUMBER)}
            />
          </VStack>
        </Card>
      </ReportSection>
    </VStack>
  );
}

/**
 * Trip check: official signals for any place in Uttarakhand, on the reader's travel date.
 *
 * The app's headline tool for travellers. It shows evidence - warnings, forecast, road
 * closures, signal, helplines - and never declares a journey safe.
 */
export function TripCheckScreen({ initialTo, initialDate }: TripCheckScreenProps) {
  const t = useT();
  const theme = useTheme();
  const language = useLanguage();
  const [checkedAt] = useState(() => new Date());
  const [to, setTo] = useState(initialTo ?? '');
  const [travelDate, setTravelDate] = useState(() =>
    normaliseTravelDate(initialDate, checkedAt)
  );

  const districtsQuery = useDistricts();
  const guideQuery = useTourismGuide();
  const guide = guideQuery.data ?? null;

  const districts = useMemo(
    () =>
      (districtsQuery.data ?? []).map((district) => ({
        slug: district.slug,
        // Matched against the guide's English district names, so always English here.
        name: district.name.en,
      })),
    [districtsQuery.data]
  );

  const options = useMemo(
    () =>
      destinationOptions(guide, districts).map((option) => ({
        value: option.value,
        label:
          option.group === 'trip.group.districts'
            ? t('trip.districtOf', { district: option.label })
            : option.label,
        description: option.description,
        group: t(option.group),
      })),
    [guide, districts, t]
  );

  const destination = resolveDestination(to, guide, districts);
  const dates = travelDates(checkedAt);

  const refresh = () => {
    void districtsQuery.refetch();
    void guideQuery.refetch();
  };

  return (
    <Screen onRefresh={refresh} refreshing={districtsQuery.isRefetching}>
      <Card tone="primary" elevation="none">
        <HStack gap="md" align="flex-start">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Icon name="calendar-outline" size={22} tone="textInverse" />
          </View>
          <VStack grow gap="xxs">
            <Eyebrow color="primary">{t('trip.eyebrow')}</Eyebrow>
            <Text variant="title">{t('trip.title')}</Text>
            <Text variant="body" color="textMuted">
              {t('trip.intro')}
            </Text>
          </VStack>
        </HStack>
      </Card>

      {districtsQuery.isPending ? (
        <LoadingState label={t('trip.loadingPlaces')} />
      ) : districts.length === 0 ? (
        <Card tone="warning" elevation="none">
          <Text variant="body">{t('trip.placesFailed')}</Text>
        </Card>
      ) : (
        <Card padding="md">
          <VStack gap="md">
            <SelectField
              label={t('trip.where')}
              placeholder={t('trip.wherePlaceholder')}
              value={to}
              options={options}
              onSelect={setTo}
              searchable
            />
            <VStack gap="xs">
              <Text variant="footnote" color="textMuted">
                {t('trip.when')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack gap="xs">
                  {dates.map((date) => (
                    <Chip
                      key={date.value}
                      label={
                        date.offset === 0
                          ? t('trip.today')
                          : date.offset === 1
                            ? t('trip.tomorrow')
                            : shortDateLabel(date.value)
                      }
                      selected={date.value === travelDate}
                      onPress={() => setTravelDate(date.value)}
                    />
                  ))}
                </HStack>
              </ScrollView>
            </VStack>
          </VStack>
        </Card>
      )}

      {destination !== null ? (
        <TripReport
          key={`${destination.slug}`}
          destination={destination}
          travelDate={travelDate}
          onChangeDate={setTravelDate}
          guide={guide}
          checkedAt={checkedAt}
        />
      ) : (
        <>
          {to !== '' && !districtsQuery.isPending ? (
            <Card tone="muted" elevation="none">
              <Text variant="body">{t('trip.notInList')}</Text>
            </Card>
          ) : null}
          {guide !== null && guide.charDham.length > 0 ? (
            <VStack gap="sm">
              <SectionHeader
                title={t('trip.start.title')}
                subtitle={t('trip.start.subtitle')}
              />
              <HStack gap="sm" wrap>
                {guide.charDham.map((place) => (
                  <Pressable
                    key={place.slug}
                    onPress={() => setTo(place.slug)}
                    accessibilityLabel={place.name}
                    style={{
                      flexGrow: 1,
                      flexBasis: '45%',
                      height: 170,
                      borderRadius: theme.radius.lg,
                      overflow: 'hidden',
                      backgroundColor: theme.colors.surfaceMuted,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Image
                      source={{ uri: place.imageUrl }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      contentFit="cover"
                      accessibilityIgnoresInvertColors
                    />
                    <View
                      style={{
                        margin: theme.spacing.xs,
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.surfaceGlassStrong,
                      }}
                    >
                      <Text variant="bodyStrong">
                        {language === 'hi' ? place.nameHi : place.name}
                      </Text>
                      <Text variant="footnote" color="textMuted">
                        {place.district} · {formatNumber(place.altitudeM)} m
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </HStack>
            </VStack>
          ) : null}
          <VStack gap="sm">
            <SectionHeader title={t('trip.what.title')} />
            {(
              [
                ['warning-outline', 'trip.what.warnings', 'trip.what.warnings.body'],
                ['rainy-outline', 'trip.what.weather', 'trip.what.weather.body'],
                ['car-outline', 'trip.what.roads', 'trip.what.roads.body'],
                ['cellular-outline', 'trip.what.signal', 'trip.what.signal.body'],
                ['call-outline', 'trip.what.help', 'trip.what.help.body'],
              ] as const
            ).map(([icon, title, body]) => (
              <HStack key={title} gap="md" align="flex-start">
                <Icon name={icon} tone="primary" />
                <VStack gap="xxs" grow>
                  <Text variant="bodyStrong">{t(title)}</Text>
                  <Text variant="caption" color="textMuted">
                    {t(body)}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </>
      )}

      <Text variant="footnote" color="textMuted">
        {t('trip.disclaimer')}
      </Text>
    </Screen>
  );
}
