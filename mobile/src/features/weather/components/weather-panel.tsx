import { Card, Divider, HStack, Icon, Text, VStack, type IconName } from '@/components/atoms';
import { SourceNote } from '@/components/molecules';
import { formatDate, formatRelative, formatUnit, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';
import type { Provenance } from '@/types/api';

import { CONDITION_ICONS, type ForecastDay, type WeatherData } from '../schemas';

function conditionIcon(key: keyof typeof CONDITION_ICONS | undefined): IconName {
  return (CONDITION_ICONS[key ?? 'unknown'] ?? 'help-circle-outline') as IconName;
}

function ForecastRow({ day }: { day: ForecastDay }) {
  const language = useLanguage();
  const theme = useTheme();

  return (
    <HStack align="center" gap="md" paddingY="xs">
      <Text variant="caption" color="textMuted" style={{ width: 78 }}>
        {formatDate(day.date)}
      </Text>

      <Icon name={conditionIcon(day.condition?.condition)} size={18} tone="accent" />

      <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
        {day.condition ? localise(day.condition.label, language) : '—'}
      </Text>

      {day.precipitationMm !== null && day.precipitationMm > 0 ? (
        <Text variant="footnote" style={{ color: theme.colors.accent }} tabular>
          {formatUnit(day.precipitationMm, 'mm', 1)}
        </Text>
      ) : null}

      <Text variant="caption" tabular style={{ width: 74, textAlign: 'right' }}>
        {day.maxTemperatureC === null ? '—' : `${Math.round(day.maxTemperatureC)}°`}
        <Text variant="caption" color="textMuted">
          {day.minTemperatureC === null ? '' : ` / ${Math.round(day.minTemperatureC)}°`}
        </Text>
      </Text>
    </HStack>
  );
}

/**
 * Current conditions plus a short forecast for one district.
 *
 * Every reading is rendered through `formatUnit`, never by concatenating the raw `unit`
 * field. The web app shipped a build that printed `24 deg_c` onto live district pages
 * because one panel did the concatenation itself.
 */
export function WeatherPanel({ weather }: { weather: WeatherData }) {
  const theme = useTheme();
  const language = useLanguage();

  const stationName = localise(weather.station.name, language);
  const forecast = weather.forecast ?? [];

  /**
   * The weather endpoint reports its source in its own shape, not as a `Provenance`. It is
   * adapted here rather than in the schema so the wire format stays a faithful copy of what
   * the API sends — the mapping is a display concern.
   */
  const provenance: Provenance = weather.source
    ? {
        sourceKey: weather.source.key,
        department: weather.source.department,
        url: null,
        attribution: weather.source.attribution,
        vintage: weather.observedAt ?? '',
        fetchedAt: weather.temperature?.fetchedAt ?? '',
        freshness: 'fresh',
        mayRedistribute: true,
      }
    : null;

  return (
    <Card>
      <VStack gap="md">
        <HStack align="center" gap="md">
          <Icon name={conditionIcon(weather.condition?.condition)} size={40} tone="accent" />

          <VStack grow gap="xxs">
            <HStack align="baseline" gap="xs">
              <Text variant="display" tabular>
                {weather.temperature
                  ? `${Math.round(weather.temperature.value)}°`
                  : '—'}
              </Text>
              {weather.condition ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {localise(weather.condition.label, language)}
                </Text>
              ) : null}
            </HStack>

            <Text variant="footnote" color="textMuted" numberOfLines={1}>
              {stationName}
              {weather.observedAt ? ` · ${formatRelative(weather.observedAt)}` : ''}
            </Text>
          </VStack>
        </HStack>

        <HStack gap="lg" wrap>
          {weather.rainfall ? (
            <Reading
              icon="rainy-outline"
              label="Rain"
              value={formatUnit(weather.rainfall.value, weather.rainfall.unit, 1)}
            />
          ) : null}
          {weather.humidity ? (
            <Reading
              icon="water-outline"
              label="Humidity"
              value={formatUnit(weather.humidity.value, weather.humidity.unit)}
            />
          ) : null}
          {weather.wind ? (
            <Reading
              icon="navigate-outline"
              label="Wind"
              value={formatUnit(weather.wind.value, weather.wind.unit)}
            />
          ) : null}
        </HStack>

        {forecast.length > 0 ? (
          <VStack gap="xxs">
            <Divider spacing="xs" />
            <Text variant="footnote" color="textMuted">
              {`NEXT ${forecast.length} DAYS`}
            </Text>
            {forecast.map((day) => (
              <ForecastRow key={day.date} day={day} />
            ))}
          </VStack>
        ) : null}

        <VStack style={{ marginTop: theme.spacing.xxs }}>
          <SourceNote provenance={provenance} compact />
        </VStack>
      </VStack>
    </Card>
  );
}

function Reading({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <HStack align="center" gap="xs">
      <Icon name={icon} size={15} tone="textMuted" />
      <VStack>
        <Text variant="footnote" color="textMuted">
          {label.toUpperCase()}
        </Text>
        <Text variant="bodyStrong" tabular>
          {value}
        </Text>
      </VStack>
    </HStack>
  );
}
