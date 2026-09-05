import { err, ok, type Result } from 'neverthrow';

import type { DistrictName } from '../../../models/area.model.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import type { Position } from '../../../utils/geojson.js';

/**
 * Parsing for the Overpass JSON an OSM boundary query returns.
 *
 * Shape verified against a real response on 2026-09-04: `elements[]`, each a relation with
 * `tags` and `members[]`, where a member of `type: "way"` carries `geometry: [{lat, lon}]`
 * because the query asked for `out geom`.
 */

export interface OverpassRelation {
  id: number;
  /** The relation's `name` tag, as OSM spells it. */
  name: string;
  /** Every outer way's positions, unordered and in arbitrary direction. */
  ways: Position[][];
}

interface OverpassMember {
  type?: unknown;
  role?: unknown;
  geometry?: unknown;
}

interface OverpassElement {
  id?: unknown;
  tags?: unknown;
  members?: unknown;
}

interface OverpassResponse {
  elements?: unknown;
}

function isPositionSource(value: unknown): value is { lat: number; lon: number } {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as { lat?: unknown; lon?: unknown };
  return typeof point.lat === 'number' && typeof point.lon === 'number';
}

/**
 * A busy Overpass mirror answers HTTP 200 with an HTML error page, so "the request
 * succeeded" is not the same as "we have data". Failing to parse is the detector, and the
 * connector uses exactly that to decide whether to try the next mirror.
 */
export function parseOverpassRelations(body: string): Result<OverpassRelation[], RequestError> {
  let parsed: OverpassResponse;
  try {
    parsed = JSON.parse(body) as OverpassResponse;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const elements = parsed.elements;
  if (!Array.isArray(elements)) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const relations: OverpassRelation[] = [];

  for (const element of elements as OverpassElement[]) {
    const tags = element.tags;
    if (typeof tags !== 'object' || tags === null) continue;

    const name = (tags as { name?: unknown }).name;
    if (typeof name !== 'string' || name.length === 0) continue;

    const members = Array.isArray(element.members) ? (element.members as OverpassMember[]) : [];
    const ways: Position[][] = [];

    for (const member of members) {
      if (member.type !== 'way') continue;
      // Inner ways carve holes (an enclave). Districts here have none, and treating an inner
      // way as an outer one would produce a ring that crosses the boundary it cuts out of.
      if (member.role !== 'outer' && member.role !== '' && member.role !== undefined) continue;
      if (!Array.isArray(member.geometry)) continue;

      const positions: Position[] = [];
      for (const point of member.geometry as unknown[]) {
        // Overpass states `lat`/`lon` as named fields; GeoJSON wants [lon, lat]. The swap
        // happens here, at this source's edge, per the rule in utils/geojson.ts.
        if (isPositionSource(point)) positions.push([point.lon, point.lat]);
      }

      if (positions.length >= 2) ways.push(positions);
    }

    if (ways.length === 0) continue;

    relations.push({
      id: typeof element.id === 'number' ? element.id : 0,
      name,
      ways,
    });
  }

  if (relations.length === 0) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  return ok(relations);
}

/**
 * Matches an OSM relation name onto one of our districts.
 *
 * OSM does not spell every district the way our reference data does — verified differences
 * on 2026-09-04: "Pithoragarh district" carries a suffix, and OSM writes "Hardwar" for
 * Haridwar in some places. So this normalises away the common suffix and then compares, and
 * falls back to a containment test in both directions.
 *
 * Deliberately NOT fuzzy beyond that. Silently attaching the wrong geometry to a district
 * would be invisible on a map and wrong forever; a district left unmatched is reported and
 * keeps its previous boundary.
 */
export function matchRelationToDistrict(
  relationName: string,
  districts: readonly DistrictName[],
): DistrictName | null {
  const normalise = (value: string): string =>
    value
      .toLowerCase()
      .replace(/\s+district$/, '')
      .replace(/\s+/g, ' ')
      .trim();

  const target = normalise(relationName);

  const exact = districts.find((district) => normalise(district.nameEn) === target);
  if (exact !== undefined) return exact;

  const hindi = districts.find((district) => district.nameHi === relationName.trim());
  if (hindi !== undefined) return hindi;

  const contained = districts.filter((district) => {
    const name = normalise(district.nameEn);
    return name.includes(target) || target.includes(name);
  });

  // Ambiguity is a failure, not a coin flip: "Garhwal" contains both Pauri Garhwal and
  // Tehri Garhwal, and picking either would put one district's outline on the other.
  return contained.length === 1 ? (contained[0] as DistrictName) : null;
}

export interface OverpassPlace {
  osmId: number;
  name: string;
  /** OSM's `name:hi`. Null for the overwhelming majority — see migration 018. */
  nameHi: string | null;
  lat: number;
  lng: number;
  /** `village` or `hamlet`, as OSM classifies it. */
  place: string;
}

/** Named `place=village|hamlet` nodes from an Overpass extract. */
export function parseOverpassPlaces(body: string): Result<OverpassPlace[], RequestError> {
  let parsed: OverpassResponse;
  try {
    parsed = JSON.parse(body) as OverpassResponse;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const elements = parsed.elements;
  if (!Array.isArray(elements)) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const places: OverpassPlace[] = [];

  for (const element of elements as (OverpassElement & { lat?: unknown; lon?: unknown })[]) {
    const tags = element.tags;
    if (typeof tags !== 'object' || tags === null) continue;

    const record = tags as { name?: unknown; 'name:hi'?: unknown; place?: unknown };
    if (typeof record.name !== 'string' || record.name.trim().length === 0) continue;
    if (typeof element.lat !== 'number' || typeof element.lon !== 'number') continue;

    places.push({
      osmId: typeof element.id === 'number' ? element.id : 0,
      name: record.name.trim(),
      nameHi: typeof record['name:hi'] === 'string' ? record['name:hi'].trim() : null,
      lat: element.lat,
      lng: element.lon,
      place: typeof record.place === 'string' ? record.place : 'village',
    });
  }

  if (places.length === 0) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  return ok(places);
}

/** Levenshtein distance, bailing out early when the lengths cannot be close enough. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current.push(
        Math.min(
          (previous[j] as number) + 1,
          (current[j - 1] as number) + 1,
          (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1)
        )
      );
    }
    previous = current;
  }

  return previous[b.length] as number;
}

function normaliseName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+tehsil$/, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Matches an OSM tehsil relation name onto our curated tehsil list.
 *
 * OSM and the official list disagree on spelling far more often than they do for districts —
 * verified pairs include Hardwar/Haridwar, Garud/Garur, Puraula/Purola, Sult/Salt and
 * Chaukhutiya/Chaukhutia. Exact matching alone found 69 of 80; allowing a small edit distance
 * finds 78.
 *
 * A near match is only accepted when it is UNAMBIGUOUS — strictly closer than every other
 * candidate. Ambiguity returns null, because attaching several hundred villages to the wrong
 * tehsil is invisible once done and very hard to notice later.
 */
export function matchTehsilName(
  osmName: string,
  candidates: readonly { key: string; name: string }[]
): string | null {
  const target = normaliseName(osmName);
  if (target.length === 0) return null;

  const exact = candidates.find((candidate) => normaliseName(candidate.name) === target);
  if (exact !== undefined) return exact.key;

  let best: { key: string; distance: number } | null = null;
  let runnerUp = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = editDistance(target, normaliseName(candidate.name), 2);
    if (best === null || distance < best.distance) {
      runnerUp = best?.distance ?? runnerUp;
      best = { key: candidate.key, distance };
    } else if (distance < runnerUp) {
      runnerUp = distance;
    }
  }

  if (best === null || best.distance > 2) return null;
  return best.distance < runnerUp ? best.key : null;
}
