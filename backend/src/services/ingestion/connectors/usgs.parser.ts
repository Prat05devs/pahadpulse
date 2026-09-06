import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('@usgs.parser');

/**
 * USGS FDSN event GeoJSON. Only the fields used are described; unknown keys are ignored so
 * an upstream addition never fails a run.
 *
 * `mag` is nullable in the feed — a detection can exist before a magnitude is computed.
 * Such an event is skipped rather than stored as magnitude 0, which would render as a
 * harmless tremor when it may be anything at all.
 */
const UsgsPropertiesSchema = z.object({
  mag: z.number().nullable(),
  place: z.string().nullable().optional(),
  /** Epoch milliseconds, UTC. */
  time: z.number(),
  updated: z.number().nullable().optional(),
  url: z.string().nullable().optional(),
  magType: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

const UsgsFeatureSchema = z.object({
  id: z.string().min(1),
  properties: UsgsPropertiesSchema,
  geometry: z
    .object({
      /** `[lng, lat, depth_km]` — depth is the THIRD element, in kilometres. */
      coordinates: z.array(z.number()).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const UsgsResponseSchema = z.object({
  features: z.array(UsgsFeatureSchema),
});

export type UsgsFeature = z.infer<typeof UsgsFeatureSchema>;

export function parseUsgsResponse(text: string): Result<UsgsFeature[], RequestError> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logger.warn('USGS returned a body that is not JSON');
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const parsed = UsgsResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn('USGS response did not match the expected schema', {
      issues: parsed.error.issues.slice(0, 3).map((issue) => issue.path.join('.')),
    });
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  return ok(parsed.data.features);
}

export interface SeismicReading {
  lng: number;
  lat: number;
  depthKm: number | null;
}

/**
 * Position and depth from a USGS geometry.
 *
 * The third coordinate is depth in kilometres, which GeoJSON nominally reserves for
 * elevation — USGS uses it for depth below the surface, positive downward. It is read
 * explicitly here rather than assumed elsewhere, because a depth silently read as an
 * altitude would put every earthquake in the sky.
 */
export function readGeometry(feature: UsgsFeature): SeismicReading | null {
  const coordinates = feature.geometry?.coordinates;
  if (coordinates === undefined || coordinates === null || coordinates.length < 2) return null;

  const lng = coordinates[0];
  const lat = coordinates[1];
  if (lng === undefined || lat === undefined) return null;

  const depth = coordinates[2];
  return { lng, lat, depthKm: depth === undefined ? null : depth };
}

/** Epoch milliseconds → the `YYYY-MM-DD HH:MM:SS` UTC string DATETIME columns take. */
export function epochToMysqlUtc(epochMs: number): string | null {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}
