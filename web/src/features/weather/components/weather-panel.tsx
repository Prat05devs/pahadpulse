import React from 'react';
import type { Condition, ForecastDay, WeatherData } from '../schemas';

interface WeatherPanelProps {
  weather: WeatherData;
}

const CONDITION_ICONS: Record<Condition['condition'], string> = {
  clear: '☀️',
  partly_cloudy: '🌤️',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  heavy_rain: '⛈️',
  snow: '❄️',
  thunderstorm: '🌩️',
  unknown: '🌡️',
};

/**
 * Formats a measurement, or an em dash when there isn't one.
 *
 * The explicit null/undefined check is the entire point. The obvious `value || '—'` treats
 * a real zero as missing, and zero is not an unusual reading here: 0 mm of rain is the
 * normal state for most of the year, and 0°C is an ordinary winter morning in Uttarkashi.
 */
function formatMeasurement(value: number | undefined | null, unit: string, decimals = 1): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(decimals)}${unit}`;
}

/** Compass point from a bearing in degrees. Readers think in directions, not degrees. */
function compassPoint(degrees: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return points[index] ?? 'N';
}

function formatDay(date: string, index: number): string {
  if (index === 0) return 'Today';
  // Parsed as UTC deliberately: the API already resolved this to a local calendar date,
  // so re-interpreting it in the viewer's zone would shift it back off by a day.
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
}

function ForecastStrip({ days }: { days: ForecastDay[] }) {
  if (days.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm text-text-light/60 mb-2">7-day forecast</p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={day.date} className="text-center rounded-md bg-bg-light/60 py-2 px-1">
            <p className="text-xs text-text-light/60">{formatDay(day.date, index)}</p>
            <p className="text-lg leading-tight" aria-hidden="true">
              {day.condition ? CONDITION_ICONS[day.condition.condition] : '—'}
            </p>
            <p className="text-xs font-semibold">
              {day.maxTemperatureC === null ? '—' : `${Math.round(day.maxTemperatureC)}°`}
            </p>
            <p className="text-xs text-text-light/50">
              {day.minTemperatureC === null ? '—' : `${Math.round(day.minTemperatureC)}°`}
            </p>
            {day.condition && <span className="sr-only">{day.condition.label.en}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Current conditions and the week ahead for one district.
 *
 * The station's own name leads the panel — 'Gopeshwar', not 'Chamoli'. A district spans
 * thousands of metres of elevation and a single temperature for all of it would be a
 * fiction; naming the town the reading is actually from is what keeps the number honest.
 */
export function WeatherPanel({ weather }: WeatherPanelProps) {
  const { station, condition, temperature, rainfall, humidity, wind, windDirection } = weather;

  const observedAt = weather.observedAt === null ? null : weather.observedAt;
  const observedLabel =
    observedAt === undefined || observedAt === null
      ? null
      : new Date(observedAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        });

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-lg">Weather</h2>
          <p className="text-sm text-text-light/60">
            Measured at {station.name.en}
            {station.name.hi ? ` · ${station.name.hi}` : ''}
          </p>
        </div>
        {condition && (
          <div className="text-right">
            <p className="text-3xl leading-none" aria-hidden="true">
              {CONDITION_ICONS[condition.condition]}
            </p>
            <p className="text-sm font-medium mt-1">{condition.label.en}</p>
            <p className="text-xs text-text-light/50">{condition.label.hi}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div>
          <p className="text-sm text-text-light/60 mb-1">🌡️ Temperature</p>
          <p className="text-2xl font-bold">{formatMeasurement(temperature?.value, '°C')}</p>
        </div>
        <div>
          <p className="text-sm text-text-light/60 mb-1">💧 Rainfall</p>
          <p className="text-2xl font-bold">{formatMeasurement(rainfall?.value, ' mm')}</p>
        </div>
        <div>
          <p className="text-sm text-text-light/60 mb-1">💨 Humidity</p>
          <p className="text-2xl font-bold">{formatMeasurement(humidity?.value, '%', 0)}</p>
        </div>
        <div>
          <p className="text-sm text-text-light/60 mb-1">🍃 Wind</p>
          <p className="text-2xl font-bold">
            {formatMeasurement(wind?.value, ' km/h')}
            {windDirection !== undefined && (
              <span className="text-sm font-normal text-text-light/60">
                {' '}
                {compassPoint(windDirection.value)}
              </span>
            )}
          </p>
        </div>
      </div>

      <ForecastStrip days={weather.forecast ?? []} />

      {/* The reading's own time and source, shown rather than implied: a weather panel that
          cannot say when it was taken or who measured it is the one that misleads quietest. */}
      <p className="text-xs text-text-light/40 mt-4">
        {observedLabel !== null && <>Observed {observedLabel} IST</>}
        {observedLabel !== null && weather.source !== undefined && ' · '}
        {weather.source !== undefined && weather.source.attribution}
      </p>
    </div>
  );
}
