import { Metric } from '../types/hydromet.js';

/**
 * India's National Air Quality Index (CPCB, 2014).
 *
 * This exists because the page previously showed Open-Meteo's `us_aqi` — a US EPA index —
 * to an Indian audience. The two scales are not interchangeable: they use different
 * breakpoints and different band names, so the same air yields a different number AND
 * frequently a different category. Relabelling the US number "National AQI" would have
 * misreported air quality, so the index is computed from the concentrations instead.
 *
 * METHOD (CPCB, National Air Quality Index, Central Pollution Control Board, 2014):
 *   1. Each pollutant gets a sub-index, by linear interpolation within the band its
 *      concentration falls in.
 *   2. The AQI is the MAXIMUM of those sub-indices — the worst pollutant defines the air.
 *   3. At least three pollutants are required, and one of them must be PM2.5 or PM10.
 *      Below that the index is not defined and this returns null rather than a guess.
 *
 * AVERAGING PERIOD is part of the standard, not a detail: 24 hours for PM2.5, PM10, NO2 and
 * SO2, and 8 hours for CO and O3. A single hourly reading put through these breakpoints is
 * NOT the National AQI, so the caller must supply averages over the right window — the
 * `AVERAGING_HOURS` map below is the contract, and the repository query is built from it.
 *
 * NOT COMPUTED FROM: NH3 and Pb, the remaining two of CPCB's eight pollutants. Open-Meteo
 * publishes neither. Their absence can only bias the index DOWNWARD (the AQI is a maximum),
 * so the result is a floor rather than an overstatement — and `pollutantsUsed` reports what
 * actually went in, so the shortfall is visible instead of implied.
 */

/** CPCB's six categories. Distinct from the US EPA bands in `AqiBand`, deliberately. */
export enum NationalAqiBand {
  Good = 'good',
  Satisfactory = 'satisfactory',
  Moderate = 'moderate',
  Poor = 'poor',
  VeryPoor = 'very_poor',
  Severe = 'severe',
}

/** The averaging window each pollutant's sub-index is defined over. */
export const AVERAGING_HOURS: Readonly<Partial<Record<Metric, number>>> = {
  [Metric.Pm25]: 24,
  [Metric.Pm10]: 24,
  [Metric.NitrogenDioxide]: 24,
  [Metric.SulphurDioxide]: 24,
  [Metric.CarbonMonoxide]: 8,
  [Metric.Ozone]: 8,
};

/**
 * How many hourly readings a window needs before its mean may be used.
 *
 * CPCB requires a minimum of 16 hours of data for a 24-hour average, and monitoring practice
 * applies 6 of 8 for the 8-hour ones. Without this the index would happily compute from a
 * single reading and present it as a 24-hour average — which is the exact misrepresentation
 * this module exists to avoid, and was the real state of the data before the connector
 * began storing the hourly series.
 *
 * A pollutant short of its minimum is DROPPED rather than substituted. It may then fall below
 * CPCB's three-pollutant rule, in which case there is no index — which is the honest answer.
 */
export const MINIMUM_SAMPLES: Readonly<Partial<Record<Metric, number>>> = {
  [Metric.Pm25]: 16,
  [Metric.Pm10]: 16,
  [Metric.NitrogenDioxide]: 16,
  [Metric.SulphurDioxide]: 16,
  [Metric.CarbonMonoxide]: 6,
  [Metric.Ozone]: 6,
};

/** One averaged pollutant as the repository returns it. */
export interface PollutantAverage {
  metric: Metric;
  average: number;
  sampleCount: number;
}

/**
 * Keeps only the pollutants whose window carries enough readings to be an average at all.
 * Separated from `computeNationalAqi` so the arithmetic stays testable without a coverage
 * story, and so the rule that discards data is visible rather than buried in a filter.
 */
export function withAdequateCoverage(
  averages: readonly PollutantAverage[],
): Partial<Record<Metric, number>> {
  const eligible: Partial<Record<Metric, number>> = {};
  for (const entry of averages) {
    const minimum = MINIMUM_SAMPLES[entry.metric];
    if (minimum === undefined || entry.sampleCount < minimum) continue;
    eligible[entry.metric] = entry.average;
  }
  return eligible;
}

/** `[concentrationLow, concentrationHigh, indexLow, indexHigh]`, in the pollutant's unit. */
type Breakpoint = readonly [number, number, number, number];

/**
 * CPCB breakpoints, transcribed as the standard TABULATES them.
 *
 * The bounds are inclusive integer ranges — PM10's third band is 101-250, not 100-250 — and
 * the interpolation uses those tabulated bounds. That distinction is not cosmetic: taking
 * the bands as contiguous (100-250) shifts every sub-index inside them and stops the
 * function reproducing CPCB's own worked figures. PM10 at 175 µg/m³ is 150 by the
 * standard's arithmetic and 151 by the contiguous reading.
 *
 * Concentrations are µg/m³ except CO, which the standard defines in mg/m³ — a factor of
 * 1000 that would pin CO to the top band if missed, so `toCpcbUnit` converts explicitly.
 *
 * A concentration landing in the one-unit gap between bands (PM2.5 of 30.4, say) resolves
 * into the upper band, which interpolates to just under its floor. That is within a point
 * of either neighbour and monotonic, which is the property that matters here.
 */
const BREAKPOINTS: Readonly<Partial<Record<Metric, readonly Breakpoint[]>>> = {
  [Metric.Pm25]: [
    [0, 30, 0, 50],
    [31, 60, 51, 100],
    [61, 90, 101, 200],
    [91, 120, 201, 300],
    [121, 250, 301, 400],
    [251, Number.POSITIVE_INFINITY, 401, 500],
  ],
  [Metric.Pm10]: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [431, Number.POSITIVE_INFINITY, 401, 500],
  ],
  [Metric.NitrogenDioxide]: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 180, 101, 200],
    [181, 280, 201, 300],
    [281, 400, 301, 400],
    [401, Number.POSITIVE_INFINITY, 401, 500],
  ],
  [Metric.SulphurDioxide]: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 380, 101, 200],
    [381, 800, 201, 300],
    [801, 1600, 301, 400],
    [1601, Number.POSITIVE_INFINITY, 401, 500],
  ],
  [Metric.Ozone]: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 168, 101, 200],
    [169, 208, 201, 300],
    [209, 748, 301, 400],
    [749, Number.POSITIVE_INFINITY, 401, 500],
  ],
  // mg/m³.
  [Metric.CarbonMonoxide]: [
    [0, 1.0, 0, 50],
    [1.1, 2.0, 51, 100],
    [2.1, 10, 101, 200],
    [10.1, 17, 201, 300],
    [17.1, 34, 301, 400],
    [34.1, Number.POSITIVE_INFINITY, 401, 500],
  ],
};

/** CO is stored in µg/m³ but the standard's breakpoints are mg/m³. */
function toCpcbUnit(metric: Metric, value: number): number {
  return metric === Metric.CarbonMonoxide ? value / 1000 : value;
}

/**
 * One pollutant's sub-index.
 *
 * Linear interpolation inside the matched band:
 *   I = (I_hi - I_lo) / (C_hi - C_lo) * (C - C_lo) + I_lo
 *
 * The open-ended top band has no upper concentration, so it is capped at 500 rather than
 * extrapolated — CPCB's scale stops there, and a "612" would be a number the standard does
 * not define.
 */
export function subIndex(metric: Metric, concentration: number): number | null {
  const bands = BREAKPOINTS[metric];
  if (bands === undefined || !Number.isFinite(concentration) || concentration < 0) return null;

  const value = toCpcbUnit(metric, concentration);

  for (const [cLo, cHi, iLo, iHi] of bands) {
    if (value <= cHi) {
      if (!Number.isFinite(cHi)) return 500;
      const ratio = (iHi - iLo) / (cHi - cLo);
      return Math.round(ratio * (value - cLo) + iLo);
    }
  }
  return 500;
}

export function classifyNationalAqi(value: number): NationalAqiBand {
  if (value <= 50) return NationalAqiBand.Good;
  if (value <= 100) return NationalAqiBand.Satisfactory;
  if (value <= 200) return NationalAqiBand.Moderate;
  if (value <= 300) return NationalAqiBand.Poor;
  if (value <= 400) return NationalAqiBand.VeryPoor;
  return NationalAqiBand.Severe;
}

export interface NationalAqi {
  value: number;
  band: NationalAqiBand;
  /** The pollutant whose sub-index set the value — the AQI is a maximum, so one always does. */
  dominantPollutant: Metric;
  /** Every pollutant that contributed, with its sub-index. Shown so the figure is auditable. */
  pollutantsUsed: Array<{ metric: Metric; subIndex: number; averagingHours: number }>;
}

/**
 * The National AQI for a set of averaged concentrations, or null when CPCB's minimum
 * data requirement is not met.
 *
 * Returning null rather than a partial number is the whole point: an index computed from
 * one pollutant is not an AQI, and publishing it as one would be exactly the kind of
 * authoritative-looking invention this platform exists to avoid.
 */
export function computeNationalAqi(
  concentrations: Readonly<Partial<Record<Metric, number>>>,
): NationalAqi | null {
  const used: NationalAqi['pollutantsUsed'] = [];

  for (const metric of Object.keys(BREAKPOINTS) as Metric[]) {
    const concentration = concentrations[metric];
    if (concentration === undefined) continue;
    const index = subIndex(metric, concentration);
    if (index === null) continue;
    used.push({
      metric,
      subIndex: index,
      averagingHours: AVERAGING_HOURS[metric] ?? 24,
    });
  }

  // CPCB: at least three pollutants, one of which must be PM2.5 or PM10.
  const hasParticulate = used.some(
    (entry) => entry.metric === Metric.Pm25 || entry.metric === Metric.Pm10,
  );
  if (used.length < 3 || !hasParticulate) return null;

  const dominant = used.reduce((worst, entry) => (entry.subIndex > worst.subIndex ? entry : worst));

  return {
    value: dominant.subIndex,
    band: classifyNationalAqi(dominant.subIndex),
    dominantPollutant: dominant.metric,
    pollutantsUsed: used.sort((a, b) => b.subIndex - a.subIndex),
  };
}
