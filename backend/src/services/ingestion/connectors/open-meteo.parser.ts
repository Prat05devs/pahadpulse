import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('@open-meteo.parser');

/**
 * Open-Meteo's response, validated at the boundary (N5).
 *
 * Every measurement is `.nullable()` because the API returns null for a field it cannot
 * model at a coordinate rather than omitting it — and a null that Zod coerced to 0 would
 * publish "0°C in Gopeshwar" as a fact. The connector drops nulls; it never defaults them.
 *
 * Unknown keys are ignored by default, which is what we want: Open-Meteo adds fields
 * routinely and a strict schema would turn a harmless addition into a failed run.
 */
const CurrentSchema = z.object({
  time: z.string().min(1),
  temperature_2m: z.number().nullable().optional(),
  relative_humidity_2m: z.number().nullable().optional(),
  precipitation: z.number().nullable().optional(),
  weather_code: z.number().nullable().optional(),
  wind_speed_10m: z.number().nullable().optional(),
  wind_direction_10m: z.number().nullable().optional(),
});

const DailySchema = z.object({
  time: z.array(z.string().min(1)),
  weather_code: z.array(z.number().nullable()).optional(),
  temperature_2m_max: z.array(z.number().nullable()).optional(),
  temperature_2m_min: z.array(z.number().nullable()).optional(),
  precipitation_sum: z.array(z.number().nullable()).optional(),
});

const UnitsSchema = z.record(z.string(), z.string()).optional();

const OpenMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  /**
   * Seconds to ADD to UTC to reach the timezone the timestamps are written in. The single
   * most important field in this response — see `localToUtc`.
   */
  utc_offset_seconds: z.number(),
  current: CurrentSchema.optional(),
  current_units: UnitsSchema,
  daily: DailySchema.optional(),
  daily_units: UnitsSchema,
});

export type OpenMeteoResponse = z.infer<typeof OpenMeteoResponseSchema>;

export function parseOpenMeteoResponse(text: string): Result<OpenMeteoResponse, RequestError> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logger.warn('Open-Meteo returned a body that is not JSON');
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const parsed = OpenMeteoResponseSchema.safeParse(json);
  if (!parsed.success) {
    // A schema change upstream surfaces here as a failed run rather than as silently
    // missing values — which is the whole reason the boundary is validated (DS-8).
    logger.warn('Open-Meteo response did not match the expected schema', {
      issues: parsed.error.issues.slice(0, 3).map((issue) => issue.path.join('.')),
    });
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  return ok(parsed.data);
}

/**
 * Converts an Open-Meteo local timestamp to the UTC string the DATETIME columns take.
 *
 * This request asks for `timezone=Asia/Kolkata`, so every timestamp in the response is
 * IST wall-clock with NO offset attached: `2026-09-06T12:15`. Handing that to `new Date()`
 * would parse it in the SERVER's timezone — UTC on Render — and store a reading taken at
 * half past noon in Dehradun as though it happened at half past noon UTC, six hours late.
 *
 * The response's own `utc_offset_seconds` is the authority for the correction, rather than
 * a hardcoded +5:30: it is what the API actually applied, and letting the payload state its
 * own offset is what keeps this correct if the request's timezone parameter ever changes.
 *
 * Returns null on anything unparseable — never a fabricated timestamp.
 */
export function localToUtc(local: string, utcOffsetSeconds: number): string | null {
  // Two shapes arrive here: `2026-09-06T12:15` for current conditions, and a bare
  // `2026-09-06` for a forecast day, which means midnight local.
  let candidate: string;
  if (!local.includes('T')) {
    candidate = `${local}T00:00:00Z`;
  } else if (local.length === 16) {
    candidate = `${local}:00Z`;
  } else {
    candidate = `${local}Z`;
  }

  // Parsed as if it were UTC, deliberately: that yields the wall-clock instant, which the
  // offset then corrects. The trailing `Z` is what makes this step independent of whatever
  // timezone the server happens to run in.
  const asUtc = new Date(candidate);
  if (Number.isNaN(asUtc.getTime())) return null;

  const corrected = new Date(asUtc.getTime() - utcOffsetSeconds * 1000);
  return corrected
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}
