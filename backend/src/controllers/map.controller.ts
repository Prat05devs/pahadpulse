import { err, ok, type Result } from 'neverthrow';

import type { Geometry } from '../utils/geojson.js';
import type { RequestError } from '../utils/errors.js';
import { AreaRepository } from '../repositories/area.repository.js';
import type { AlertOut } from '../models/alert.model.js';
import type { Division } from '../types/area.js';
import { listActive } from './alert.controller.js';

/**
 * The map's data endpoints.
 *
 * These serve RFC 7946 GeoJSON rather than the domain shapes the rest of the API returns,
 * because their consumer is a map renderer that takes a FeatureCollection directly. Building
 * that shape here rather than in the browser keeps the conversion in one tested place and
 * means the client ships no geometry-assembly code.
 *
 * Neither endpoint introduces a new source of truth: districts come from `geography` and
 * alerts come through `alert.controller.listActive`, which is what applies the DS-6
 * redistribution filter. The map must never become a side door around that.
 */

export interface DistrictFeatureProperties {
  areaId: number;
  slug: string;
  nameEn: string;
  nameHi: string;
  division: Division | null;
  /** Label anchor. The renderer places the district name here rather than at the polygon's
   *  visual centre, which for a valley district can fall outside the district. */
  centroid: { lat: number; lng: number } | null;
  /** TRUE while the geometry is a generated placeholder, so the map can say so (GEO-7). */
  isPlaceholder: boolean;
  sourceNote: string;
}

export interface AlertFeatureProperties {
  alertId: number;
  type: string;
  severity: string;
  urgency: string;
  headline: string;
  language: string;
  authority: string;
  issuedAt: string;
  expiresAt: string | null;
  /** Which districts the alert names, so clicking a district can filter to its alerts. */
  areaSlugs: string[];
  attribution: string | null;
}

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

/** What a feature on this map may carry. A Point only ever appears on an alert — see
 *  `toGeometry` for when and why. */
export type MapGeometry = Geometry | PointGeometry;

export interface GeoFeature<TProperties> {
  type: 'Feature';
  id: number;
  geometry: MapGeometry | null;
  properties: TProperties;
}

export interface GeoFeatureCollection<TProperties> {
  type: 'FeatureCollection';
  features: GeoFeature<TProperties>[];
  /** Rendered on the map surface. ODbL requires it for boundaries; DS-1 requires it for
   *  everything else. Carried in the payload so no client can forget it. */
  attribution: string[];
}

const OSM_ATTRIBUTION = 'Map data (c) OpenStreetMap contributors, ODbL';

/**
 * Every district with its simplified boundary, in one request.
 *
 * Districts with no boundary row at all are omitted rather than returned with a null
 * geometry: a renderer cannot draw them either way, and an empty feature would put a
 * clickable label on a shape that does not exist.
 */
export async function getDistrictFeatures(): Promise<
  Result<GeoFeatureCollection<DistrictFeatureProperties>, RequestError>
> {
  const boundaries = await AreaRepository.listDistrictBoundaries();
  if (boundaries.isErr()) return err(boundaries.error);

  const features = boundaries.value.map<GeoFeature<DistrictFeatureProperties>>((boundary) => ({
    type: 'Feature',
    id: boundary.areaId,
    geometry: boundary.geojson as Geometry | null,
    properties: {
      areaId: boundary.areaId,
      slug: boundary.slug,
      nameEn: boundary.name.en,
      nameHi: boundary.name.hi,
      division: boundary.division,
      centroid: boundary.centroid,
      isPlaceholder: boundary.isPlaceholder,
      sourceNote: boundary.sourceNote,
    },
  }));

  // Only claim OSM attribution when something on the map actually came from OSM. While the
  // placeholder hexagons are still in place, claiming it would be false.
  const anyReal = boundaries.value.some((boundary) => !boundary.isPlaceholder);

  return ok({
    type: 'FeatureCollection',
    features,
    attribution: anyReal ? [OSM_ATTRIBUTION] : [],
  });
}

/**
 * Active alerts that can be drawn.
 *
 * Alerts with neither geometry nor a centroid are dropped here, not upstream — they are
 * still perfectly valid alerts and still appear in the list and the count. This endpoint is
 * only about what the map can place.
 */
export async function getAlertFeatures(
  now?: Date,
): Promise<Result<GeoFeatureCollection<AlertFeatureProperties>, RequestError>> {
  // Reuses the alert controller, so the DS-6 redistribution filter and the expiry rule are
  // applied exactly once, in one place, for both the list and the map.
  const page = await listActive({ cursor: Number.MAX_SAFE_INTEGER, limit: 200 }, now);
  if (page.isErr()) return err(page.error);

  const features: GeoFeature<AlertFeatureProperties>[] = [];
  const attribution = new Set<string>();

  for (const alert of page.value.data) {
    const geometry = toGeometry(alert);
    if (geometry === null) continue;

    if (alert.provenance !== null) attribution.add(alert.provenance.attribution);

    features.push({
      type: 'Feature',
      id: alert.id,
      geometry,
      properties: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        urgency: alert.urgency,
        headline: alert.headline,
        language: alert.language,
        authority: alert.authority,
        issuedAt: alert.issuedAt,
        expiresAt: alert.expiresAt,
        areaSlugs: alert.areas.map((area) => area.slug),
        attribution: alert.provenance?.attribution ?? null,
      },
    });
  }

  return ok({ type: 'FeatureCollection', features, attribution: [...attribution] });
}

/**
 * Prefers the real affected-area polygon, falling back to the centroid as a point.
 *
 * A point is genuinely worse than a polygon — "somewhere around here" rather than "this
 * valley" — but it is far better than omitting an active warning from the map, so the two
 * are distinguishable by geometry type and the renderer styles them differently.
 */
function toGeometry(alert: AlertOut): MapGeometry | null {
  if (alert.geometry !== null && alert.geometry !== undefined) {
    return alert.geometry as Geometry;
  }
  if (alert.centroid !== null) {
    return { type: 'Point', coordinates: [alert.centroid.lng, alert.centroid.lat] };
  }
  return null;
}
