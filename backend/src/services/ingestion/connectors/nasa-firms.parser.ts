import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('@nasa-firms.parser');

export type FireConfidence = 'low' | 'nominal' | 'high';

/** One detection, normalised across VIIRS and MODIS, ready for the repository. */
export interface ParsedFireDetection {
  sourceEventId: string;
  sensor: string;
  satellite: string;
  instrument: string;
  confidence: FireConfidence;
  confidenceRaw: string;
  frpMw: number | null;
  brightnessK: number | null;
  dayNight: 'D' | 'N' | null;
  lat: number;
  lng: number;
  /** `YYYY-MM-DD HH:MM:SS`, UTC. */
  acquiredAt: string;
}

/**
 * The CSV columns read. VIIRS and MODIS share most of them. They differ in the brightness
 * column (`bright_ti4` vs `brightness`) and in what `confidence` means.
 */
const FirmsRowSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  acq_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // HHMM, UTC. FIRMS drops leading zeros, so 0040 can arrive as `40`.
  acq_time: z.string().regex(/^\d{1,4}$/),
  satellite: z.string().min(1),
  instrument: z.string().min(1),
  confidence: z.string().min(1),
  frp: z.string().optional(),
  bright_ti4: z.string().optional(),
  brightness: z.string().optional(),
  daynight: z.string().optional(),
});

type FirmsRow = z.infer<typeof FirmsRowSchema>;

/**
 * Splits FIRMS CSV into header-keyed records.
 *
 * FIRMS CSV holds only numbers, dates and short codes, so no field is ever quoted. A plain
 * split is enough, and it saves adding a CSV library for this one source (common/13).
 * If quoting ever shows up, the header check below fails the run loudly. Nothing is
 * silently misread.
 */
function toRecords(text: string): Record<string, string>[] | null {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  const header = lines
    .shift()
    ?.split(',')
    .map((column) => column.trim());
  if (header === undefined || !header.includes('latitude') || !header.includes('longitude')) {
    return null;
  }
  if (lines.some((line) => line.includes('"'))) return null;

  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(header.map((column, i) => [column, values[i]?.trim() ?? '']));
  });
}

/**
 * Parses one FIRMS area-API response.
 *
 * FIRMS answers a bad key or an exhausted quota with HTTP 200 and a sentence of plain
 * text, not an error status. So a body without the CSV header is treated as an invalid
 * response. If it were read as zero rows, a broken key would look like a quiet day.
 * Rows that fail validation are counted as rejected, not thrown.
 */
export function parseFirmsCsv(
  text: string,
  sensor: string,
): Result<{ detections: ParsedFireDetection[]; rejected: number }, RequestError> {
  const records = toRecords(text);
  if (records === null) {
    // The first line only: it is FIRMS's own error message and never contains the key.
    logger.warn('FIRMS returned a body that is not the expected CSV', {
      sensor,
      firstLine: text.split('\n', 1)[0]?.slice(0, 120),
    });
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const detections: ParsedFireDetection[] = [];
  let rejected = 0;
  for (const record of records) {
    const parsed = FirmsRowSchema.safeParse(record);
    const detection = parsed.success ? normalise(parsed.data, sensor) : null;
    if (detection === null) {
      rejected += 1;
      continue;
    }
    detections.push(detection);
  }
  return ok({ detections, rejected });
}

function normalise(row: FirmsRow, sensor: string): ParsedFireDetection | null {
  const acquiredAt = toUtcTimestamp(row.acq_date, row.acq_time);
  const confidence = classifyConfidence(row.confidence, sensor);
  if (acquiredAt === null || confidence === null) return null;

  const isModis = sensor.startsWith('MODIS');
  const dayNight = row.daynight === 'D' || row.daynight === 'N' ? row.daynight : null;

  return {
    // Four decimals is about 11 m: finer than any pixel, so two pixels never share a key.
    sourceEventId: [
      sensor,
      row.latitude.toFixed(4),
      row.longitude.toFixed(4),
      row.acq_date,
      row.acq_time.padStart(4, '0'),
      row.satellite,
    ].join(':'),
    sensor,
    satellite: row.satellite,
    instrument: row.instrument,
    confidence,
    confidenceRaw: row.confidence.slice(0, 8),
    frpMw: toNumber(row.frp),
    brightnessK: toNumber(isModis ? row.brightness : row.bright_ti4),
    dayNight,
    lat: row.latitude,
    lng: row.longitude,
    acquiredAt,
  };
}

/**
 * One confidence scale across both instruments.
 *
 * VIIRS publishes `l`/`n`/`h`. MODIS publishes a percentage, and its own user guide sets
 * the bands: below 30 low, 30 to 79 nominal, 80 and above high. These are the published
 * bands, not thresholds this product chose.
 */
export function classifyConfidence(raw: string, sensor: string): FireConfidence | null {
  const value = raw.trim().toLowerCase();
  if (sensor.startsWith('MODIS')) {
    if (!/^\d{1,3}$/.test(value)) return null;
    const percent = Number(value);
    if (percent > 100) return null;
    if (percent < 30) return 'low';
    return percent < 80 ? 'nominal' : 'high';
  }
  if (value === 'l' || value === 'low') return 'low';
  if (value === 'n' || value === 'nominal') return 'nominal';
  if (value === 'h' || value === 'high') return 'high';
  return null;
}

/** `2026-04-12` + `740` → `2026-04-12 07:40:00`. Null for an impossible date or time. */
export function toUtcTimestamp(date: string, hhmm: string): string | null {
  const time = hhmm.padStart(4, '0');
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2));
  if (hour > 23 || minute > 59) return null;

  const parsed = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`);
  // `new Date` rolls 31 February into March rather than failing, so the date is re-checked.
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return `${date} ${time.slice(0, 2)}:${time.slice(2)}:00`;
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
