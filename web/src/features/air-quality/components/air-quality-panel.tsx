import React from 'react';
import type { AirQuality, AqiBand, NationalAqiBand } from '../schemas';

/**
 * Colour AND word for every band, never colour alone.
 *
 * A meaningful fraction of officers are red-green colourblind and none of them will
 * mention it. The label carries the meaning; the colour only reinforces it.
 */
const BAND_STYLE: Record<AqiBand, { label: string; hindi: string; bar: string; chip: string }> = {
  good: {
    label: 'Good',
    hindi: 'अच्छी',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  moderate: {
    label: 'Moderate',
    hindi: 'मध्यम',
    bar: 'bg-yellow-400',
    chip: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  },
  unhealthy_sensitive: {
    label: 'Poor for sensitive groups',
    hindi: 'संवेदनशील लोगों के लिए ख़राब',
    bar: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  unhealthy: {
    label: 'Unhealthy',
    hindi: 'अस्वास्थ्यकर',
    bar: 'bg-red-500',
    chip: 'bg-red-50 text-red-900 border-red-200',
  },
  very_unhealthy: {
    label: 'Very unhealthy',
    hindi: 'बहुत अस्वास्थ्यकर',
    bar: 'bg-purple-600',
    chip: 'bg-purple-50 text-purple-900 border-purple-200',
  },
  hazardous: {
    label: 'Hazardous',
    hindi: 'ख़तरनाक',
    bar: 'bg-rose-900',
    chip: 'bg-rose-100 text-rose-950 border-rose-300',
  },
  unknown: {
    label: 'Not known',
    hindi: 'अज्ञात',
    bar: 'bg-gray-400',
    chip: 'bg-gray-50 text-gray-800 border-gray-200',
  },
};

/**
 * CPCB's own six categories, with CPCB's own words.
 *
 * Not a re-skin of the US bands above. The scales disagree about the same air — Dehradun
 * reads 118 "Unhealthy for sensitive groups" on the US index and 171 "Moderate" on the
 * National one — so the two sets of labels are kept apart to make it impossible to render a
 * CPCB number under a US EPA word.
 *
 * Colour and word together, for the same reason as above: a meaningful fraction of officers
 * are red-green colourblind and none of them will mention it.
 */
const NATIONAL_BAND_STYLE: Record<
  NationalAqiBand,
  { label: string; hindi: string; bar: string; chip: string }
> = {
  good: {
    label: 'Good',
    hindi: 'अच्छी',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  satisfactory: {
    label: 'Satisfactory',
    hindi: 'संतोषजनक',
    bar: 'bg-lime-500',
    chip: 'bg-lime-50 text-lime-900 border-lime-200',
  },
  moderate: {
    label: 'Moderate',
    hindi: 'मध्यम',
    bar: 'bg-yellow-400',
    chip: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  },
  poor: {
    label: 'Poor',
    hindi: 'ख़राब',
    bar: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  very_poor: {
    label: 'Very poor',
    hindi: 'बहुत ख़राब',
    bar: 'bg-red-500',
    chip: 'bg-red-50 text-red-900 border-red-200',
  },
  severe: {
    label: 'Severe',
    hindi: 'गंभीर',
    bar: 'bg-rose-900',
    chip: 'bg-rose-100 text-rose-950 border-rose-300',
  },
};

/** Readable names for the pollutant that set the index. */
const POLLUTANT_LABEL: Record<string, string> = {
  'pm2_5_ug_m3': 'PM2.5',
  'pm10_ug_m3': 'PM10',
  'nitrogen_dioxide_ug_m3': 'NO₂',
  'ozone_ug_m3': 'O₃',
  'sulphur_dioxide_ug_m3': 'SO₂',
  'carbon_monoxide_ug_m3': 'CO',
};

/** The AQI axis tops out at 500; the bar is capped so an extreme value cannot overflow. */
function barWidth(value: number): string {
  return `${Math.min(100, Math.max(2, (value / 300) * 100)).toFixed(1)}%`;
}

function Pollutant({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
        {value === undefined ? '—' : value.toFixed(1)}
        {value !== undefined && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}

/**
 * One district's air quality.
 *
 * `index` staggers the entrance animation so a grid of thirteen reads in order rather than
 * flashing in at once.
 */
export function AirQualityCard({ data, index = 0 }: { data: AirQuality; index?: number }) {
  /*
   * The chip, the bar and the word all follow the NATIONAL index, so the card never mixes
   * scales — a CPCB number under a US EPA label would be the exact misreading this change
   * exists to prevent. With no national index there is no band to show, so the card falls
   * back to the neutral "not known" styling rather than borrowing the US band.
   */
  const style =
    data.nationalAqi === null
      ? BAND_STYLE.unknown
      : NATIONAL_BAND_STYLE[data.nationalAqi.band];

  return (
    <article
      className="surface-card pp-rise p-4"
      style={{ '--pp-delay': `${Math.min(index * 45, 540)}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{data.station.name.en}</h3>
          <p className="truncate text-xs text-muted-foreground">{data.station.name.hi}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${style.chip}`}
        >
          {style.label}
        </span>
      </div>

      {/* The National AQI leads. This is an Indian portal and CPCB's index is the one that
          carries authority here — the US figure is kept below as a cross-reference, not
          removed, because it is what the upstream source actually published. */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {data.nationalAqi === null ? '—' : data.nationalAqi.value}
        </span>
        <span className="text-xs text-muted-foreground">National AQI</span>
      </div>

      {data.nationalAqi === null ? (
        /* Absence is stated, never implied. A missing index is a data gap, not clean air,
           and CPCB's own rules are what withhold it. */
        <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
          Not enough readings yet for a National AQI — CPCB requires three pollutants
          averaged over 24 hours.
        </p>
      ) : (
        <p className="mt-1 text-[0.68rem] text-muted-foreground">
          Set by {POLLUTANT_LABEL[data.nationalAqi.dominantPollutant] ?? 'the worst pollutant'}
          {' · '}CPCB scale
          {data.aqi !== null && ` · US AQI ${Math.round(data.aqi.value)}`}
        </p>
      )}

      {/* The bar grows from zero once, so length registers before the number is read. */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {data.nationalAqi !== null && (
          <div
            className={`pp-grow-x h-full rounded-full ${style.bar}`}
            style={
              {
                width: barWidth(data.nationalAqi.value),
                '--pp-delay': `${Math.min(index * 45 + 160, 700)}ms`,
              } as React.CSSProperties
            }
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <Pollutant label="PM2.5" value={data.pm25?.value} unit="µg/m³" />
        <Pollutant label="PM10" value={data.pm10?.value} unit="µg/m³" />
      </div>
    </article>
  );
}

/** The plain-language answer, before any grid. */
export function AirQualitySummary({ readings }: { readings: AirQuality[] }) {
  const withAqi = readings.filter((reading) => reading.aqi !== null);

  if (withAqi.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No air quality readings are available yet.
      </p>
    );
  }

  const worst = withAqi.reduce((max, reading) =>
    (reading.aqi?.value ?? 0) > (max.aqi?.value ?? 0) ? reading : max
  );
  const band = BAND_STYLE[worst.aqi?.band ?? 'unknown'];

  const concerning = withAqi.filter(
    (reading) => (reading.aqi?.value ?? 0) > 100
  ).length;

  return (
    <div className="pp-fade">
      <p className="text-lg leading-relaxed text-text-light sm:text-xl">
        Air quality is <span className="font-semibold">{band.label.toLowerCase()}</span> at its
        worst in <span className="font-semibold">{worst.station.name.en}</span>, at{' '}
        <span className="font-mono font-semibold">{Math.round(worst.aqi?.value ?? 0)}</span> US
        AQI.{' '}
        {concerning === 0
          ? 'No district is above 100.'
          : `${concerning} of ${withAqi.length} districts are above 100.`}
      </p>
    </div>
  );
}
