import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { AlertSeverity, AlertType } from '../../../types/alert.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import createLogger from '../../../utils/logger.js';

const logger = createLogger('@gdacs.parser');

/**
 * GDACS returns GeoJSON. Only the fields this connector actually uses are described;
 * unknown keys are ignored, so GDACS adding a property never fails a run.
 */
const GdacsPropertiesSchema = z.object({
  eventtype: z.string().min(1),
  eventid: z.union([z.number(), z.string()]),
  episodeid: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  htmldescription: z.string().optional(),
  glide: z.string().optional(),
  alertlevel: z.string().optional(),
  country: z.string().optional(),
  /** GDACS's own timestamps carry no zone; see `gdacsTimestampToUtc`. */
  fromdate: z.string().optional(),
  todate: z.string().optional(),
  datemodified: z.string().optional(),
  /** The model or network the assessment came from, e.g. GLOFAS for floods. */
  source: z.string().optional(),
  url: z
    .object({
      report: z.string().optional(),
      details: z.string().optional(),
    })
    .optional(),
});

const GdacsFeatureSchema = z.object({
  geometry: z
    .object({
      type: z.string(),
      // Point coordinates, [lng, lat]. Other geometry types are ignored by the connector.
      coordinates: z.array(z.number()).optional(),
    })
    .nullable()
    .optional(),
  properties: GdacsPropertiesSchema,
});

const GdacsResponseSchema = z.object({
  features: z.array(GdacsFeatureSchema),
});

export type GdacsFeature = z.infer<typeof GdacsFeatureSchema>;

export function parseGdacsResponse(text: string): Result<GdacsFeature[], RequestError> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logger.warn('GDACS returned a body that is not JSON');
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const parsed = GdacsResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn('GDACS response did not match the expected schema', {
      issues: parsed.error.issues.slice(0, 3).map((issue) => issue.path.join('.')),
    });
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  return ok(parsed.data.features);
}

/**
 * GDACS timestamps look like `2026-08-09T01:00:00` — ISO-shaped but with no zone.
 *
 * GDACS publishes in UTC, so the `Z` is added rather than guessed at. Left bare, `new Date`
 * would read it in the server's local zone, which is the same failure mode the Open-Meteo
 * parser guards against, from a different direction.
 */
export function gdacsTimestampToUtc(value: string | undefined): string | null {
  if (value === undefined || value.length === 0) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * GDACS event type → our alert type.
 *
 * `FL` is a flood, which we have a type for. Earthquakes and cyclones have no dedicated
 * type and land in `disaster` rather than being forced into `weather`: a cyclone warning
 * and a rainfall warning are not the same kind of thing, and `disaster` is the honest
 * bucket for a scored event from a disaster-monitoring body.
 */
export function classifyGdacsEventType(eventType: string): AlertType {
  switch (eventType.toUpperCase()) {
    case 'FL':
      return AlertType.Flood;
    case 'EQ':
    case 'TC':
    case 'VO':
    case 'DR':
    case 'WF':
      return AlertType.Disaster;
    default:
      return AlertType.Disaster;
  }
}

/**
 * GDACS's three-colour alert level → CAP's severity scale.
 *
 * GDACS grades humanitarian impact on Green/Orange/Red; CAP grades severity on four levels.
 * The scales do not correspond exactly, and the mapping below is a deliberate, recorded
 * approximation rather than a claim of equivalence:
 *
 *   Green  → minor    (monitored, no significant humanitarian impact expected)
 *   Orange → severe   (potential humanitarian impact; GDACS's own escalation threshold)
 *   Red    → extreme  (severe humanitarian impact likely)
 *
 * Nothing maps to `moderate`: inventing a fourth GDACS level to fill CAP's fourth slot
 * would be fabricating precision the source does not have. An unrecognised level is
 * `unknown`, never guessed — the same rule the CAP connectors follow.
 */
export function normalizeGdacsAlertLevel(level: string | undefined): AlertSeverity {
  switch ((level ?? '').trim().toLowerCase()) {
    case 'green':
      return AlertSeverity.Minor;
    case 'orange':
      return AlertSeverity.Severe;
    case 'red':
      return AlertSeverity.Extreme;
    default:
      return AlertSeverity.Unknown;
  }
}

/** `[lng, lat]` from a Point geometry, or null for anything else. */
export function pointCoordinates(feature: GdacsFeature): readonly [number, number] | null {
  const geometry = feature.geometry;
  if (geometry === null || geometry === undefined) return null;
  if (geometry.type !== 'Point') return null;

  const coordinates = geometry.coordinates;
  if (coordinates === undefined || coordinates.length < 2) return null;

  const lng = coordinates[0];
  const lat = coordinates[1];
  if (lng === undefined || lat === undefined) return null;

  return [lng, lat];
}
