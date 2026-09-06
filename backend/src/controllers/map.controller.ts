import { err, ok, type Result } from 'neverthrow';

import type { Geometry } from '../utils/geojson.js';
import type { RequestError } from '../utils/errors.js';
import { AreaRepository } from '../repositories/area.repository.js';
import type { AlertOut } from '../models/alert.model.js';
import type { DistrictBoundary } from '../models/area.model.js';
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
  /**
   * How precisely this shape describes the affected area. The map MUST caption itself from
   * this rather than assuming, because the three are very different claims:
   *
   *   `published` — the polygon the issuing authority published. What we want.
   *   `district`  — the boundaries of the districts the alert names. Correct about which
   *                 districts, wrong about the shape within them: a warning for a river
   *                 valley is drawn over the whole district including ridges it excludes.
   *   `point`     — a single centroid. "Somewhere around here."
   *
   * Captioning a `district` extent as the authority's own published area would overstate
   * the warning's reach, which on a safety map is the expensive direction to be wrong in.
   */
  extent: AlertExtent;
}

export type AlertExtent = 'published' | 'district' | 'point';

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

  // Fetched once for the whole collection, not per alert. Needed only for the district
  // fallback below, but a warning that names nine districts would otherwise re-read the
  // same 13 boundary rows nine times (Q5).
  const boundaries = await AreaRepository.listDistrictBoundaries();
  const boundaryBySlug = new Map(
    boundaries.isOk() ? boundaries.value.map((b) => [b.slug, b]) : [],
  );

  const features: GeoFeature<AlertFeatureProperties>[] = [];
  const attribution = new Set<string>();

  for (const alert of page.value.data) {
    const placed = toGeometry(alert, boundaryBySlug);
    if (placed === null) continue;
    const { geometry, extent } = placed;

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
        extent,
      },
    });
  }

  return ok({ type: 'FeatureCollection', features, attribution: [...attribution] });
}

/**
 * Places an alert on the map, in descending order of precision.
 *
 *   1. the authority's own published polygon
 *   2. the districts the alert names, merged into one MultiPolygon
 *   3. a centroid point
 *
 * Step 2 exists because SACHET's `FetchPolygonXMLFile` endpoint began returning 403 to
 * every request, headers or not. Without a fallback, every alert lost its geometry AND its
 * centroid (the centroid is derived from the polygon), so the alerts map went completely
 * blank while the warnings themselves were arriving fine — the worst outcome, because an
 * empty map reads as "nothing to worry about" rather than as missing data.
 *
 * District extent is a real degradation and is labelled as one: it is correct about WHICH
 * districts are affected and wrong about the shape within them. The `extent` property
 * carries that distinction to the renderer so the caption can tell the truth.
 */
function toGeometry(
  alert: AlertOut,
  boundaryBySlug: Map<string, DistrictBoundary>,
): { geometry: MapGeometry; extent: AlertExtent } | null {
  if (alert.geometry !== null && alert.geometry !== undefined) {
    return { geometry: alert.geometry as Geometry, extent: 'published' };
  }

  const districtGeometry = mergeDistrictBoundaries(alert, boundaryBySlug);
  if (districtGeometry !== null) {
    return { geometry: districtGeometry, extent: 'district' };
  }

  if (alert.centroid !== null) {
    return {
      geometry: { type: 'Point', coordinates: [alert.centroid.lng, alert.centroid.lat] },
      extent: 'point',
    };
  }
  return null;
}

/**
 * The alert's named districts as one MultiPolygon.
 *
 * A true geometric union would need a polygon-clipping library to dissolve the shared
 * borders. This just collects the rings, which renders identically at any zoom the map
 * offers — the internal borders are invisible under a single fill — and adds no dependency
 * for a difference nobody can see (common/01: no new abstraction for one call site).
 *
 * The state row is skipped. Every SACHET alert is attached to the state by definition, so
 * including it would paint all of Uttarakhand for a warning about one valley.
 */
function mergeDistrictBoundaries(
  alert: AlertOut,
  boundaryBySlug: Map<string, DistrictBoundary>,
): MapGeometry | null {
  const polygons: unknown[] = [];

  for (const area of alert.areas) {
    const boundary = boundaryBySlug.get(area.slug);
    if (boundary === undefined) continue;

    const geojson = boundary.geojson as Geometry | null;
    if (geojson === null) continue;

    if (geojson.type === 'Polygon') {
      polygons.push(geojson.coordinates);
    } else if (geojson.type === 'MultiPolygon') {
      polygons.push(...geojson.coordinates);
    }
  }

  if (polygons.length === 0) return null;

  return { type: 'MultiPolygon', coordinates: polygons } as MapGeometry;
}
