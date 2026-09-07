import { err, ok, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from './errors.js';

/**
 * Geometry helpers shared by the two connectors that produce map geometry: the OSM boundary
 * connector (relations of ways → closed rings) and the SACHET alert connector (CAP polygon
 * text → a ring).
 *
 * Everything here is pure. Coordinates are GeoJSON order — `[longitude, latitude]` — and the
 * conversion from any source's own ordering happens at that source's edge, never here. Two
 * upstreams in this codebase disagree about it, so the rule has to be absolute.
 */

/** A GeoJSON position: `[longitude, latitude]`. */
export type Position = [number, number];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type Geometry = PolygonGeometry | MultiPolygonGeometry;

export interface Feature<TProperties> {
  type: 'Feature';
  geometry: Geometry;
  properties: TProperties;
}

export interface FeatureCollection<TProperties> {
  type: 'FeatureCollection';
  features: Feature<TProperties>[];
}

/** One unclosed or closed run of positions, as an OSM way arrives. */
export type LineString = Position[];

function samePoint(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Stitches unordered OSM ways into closed rings.
 *
 * An OSM boundary relation is a bag of ways in arbitrary order and arbitrary direction —
 * the relation says which ways bound the area, not how to walk them. Assembling is
 * therefore: take a way, repeatedly attach any way sharing an endpoint (reversing it when
 * needed), and close the ring when the two ends meet.
 *
 * Ways that never close are dropped rather than force-closed: a fabricated ring across a
 * gap in the data would draw a district boundary that does not exist, which is worse than
 * drawing none. The caller sees the count difference and can reject the result.
 */
export function assembleRings(ways: readonly LineString[]): Position[][] {
  const pool: LineString[] = ways.filter((way) => way.length >= 2).map((way) => [...way]);
  const rings: Position[][] = [];

  while (pool.length > 0) {
    let current = pool.shift() as LineString;
    let extended = true;

    while (extended && !samePoint(current[0] as Position, current[current.length - 1] as Position)) {
      extended = false;
      const head = current[0] as Position;
      const tail = current[current.length - 1] as Position;

      for (let i = 0; i < pool.length; i += 1) {
        const candidate = pool[i] as LineString;
        const cHead = candidate[0] as Position;
        const cTail = candidate[candidate.length - 1] as Position;

        if (samePoint(cHead, tail)) {
          current = [...current, ...candidate.slice(1)];
        } else if (samePoint(cTail, tail)) {
          current = [...current, ...[...candidate].reverse().slice(1)];
        } else if (samePoint(cTail, head)) {
          current = [...candidate.slice(0, -1), ...current];
        } else if (samePoint(cHead, head)) {
          current = [...[...candidate].reverse().slice(0, -1), ...current];
        } else {
          continue;
        }

        pool.splice(i, 1);
        extended = true;
        break;
      }
    }

    if (
      samePoint(current[0] as Position, current[current.length - 1] as Position) &&
      current.length >= 4
    ) {
      rings.push(current);
    }
  }

  return rings;
}

function perpendicularDistance(point: Position, lineStart: Position, lineEnd: Position): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy));
}

/**
 * Ramer–Douglas–Peucker, in degrees.
 *
 * Iterative rather than recursive: a district ring here runs to ~5,000 points and a
 * recursive implementation can blow the stack on a pathological split.
 */
export function simplifyRing(ring: readonly Position[], toleranceDegrees: number): Position[] {
  if (ring.length <= 3 || toleranceDegrees <= 0) return [...ring];

  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;

  const stack: [number, number][] = [[0, ring.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxDistance = 0;
    let index = first;

    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(
        ring[i] as Position,
        ring[first] as Position,
        ring[last] as Position,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > toleranceDegrees) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  const simplified = ring.filter((_, i) => keep[i] === true);

  // A ring simplified below a triangle is not a ring. Keep the original rather than emit
  // degenerate geometry that a renderer will silently drop.
  if (simplified.length < 4) return [...ring];

  // Simplification must never open a closed ring.
  const first = simplified[0] as Position;
  const last = simplified[simplified.length - 1] as Position;
  if (!samePoint(first, last)) simplified.push(first);

  return simplified;
}

/** Applies `simplifyRing` across every ring of a polygon or multipolygon. */
export function simplifyGeometry(geometry: Geometry, toleranceDegrees: number): Geometry {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, toleranceDegrees)),
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map((ring) => simplifyRing(ring, toleranceDegrees)),
    ),
  };
}

export function countPositions(geometry: Geometry): number {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.reduce((total, ring) => total + ring.length, 0);
  }
  return geometry.coordinates.reduce(
    (total, polygon) => total + polygon.reduce((sum, ring) => sum + ring.length, 0),
    0,
  );
}

/**
 * Area-weighted centroid of a polygon's outer ring, by the shoelace formula.
 *
 * Used as an alert's map anchor when the upstream states no centroid of its own. Falls back
 * to the arithmetic mean for a degenerate (zero-area) ring.
 */
export function ringCentroid(ring: readonly Position[]): Position | null {
  if (ring.length < 3) return null;

  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i] as Position;
    const [x1, y1] = ring[i + 1] as Position;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }

  if (twiceArea === 0) {
    const sum = ring.reduce<[number, number]>(
      (acc, [px, py]) => [acc[0] + px, acc[1] + py],
      [0, 0],
    );
    return [sum[0] / ring.length, sum[1] / ring.length];
  }

  const factor = 1 / (3 * twiceArea);
  return [x * factor, y * factor];
}

export function geometryCentroid(geometry: Geometry): Position | null {
  const outerRing =
    geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
  return outerRing === undefined ? null : ringCentroid(outerRing);
}

/**
 * Parses a CAP `<polygon>` value.
 *
 * CAP states coordinates as space-separated `latitude,longitude` pairs — the opposite order
 * to GeoJSON. Getting this backwards puts Uttarakhand's alerts in the Indian Ocean, so the
 * swap happens here, once, and is covered by a test.
 */
export function parseCapPolygon(raw: string): Result<PolygonGeometry, RequestError> {
  const positions: Position[] = [];

  for (const pair of raw.trim().split(/\s+/)) {
    if (pair.length === 0) continue;
    const parts = pair.split(',');
    if (parts.length !== 2) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
    }

    positions.push([lng, lat]);
  }

  if (positions.length < 3) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const first = positions[0] as Position;
  const last = positions[positions.length - 1] as Position;
  if (!samePoint(first, last)) positions.push(first);

  return ok({ type: 'Polygon', coordinates: [positions] });
}




