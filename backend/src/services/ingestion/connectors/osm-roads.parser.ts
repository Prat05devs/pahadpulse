import { err, ok, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from '../../../utils/errors.js';

/**
 * Parsing for OSM highway `ref` tags across Uttarakhand.
 *
 * OSM is crowd-tagged, so the same highway is written several ways by different mappers.
 * Verified against a real Overpass extract of 2,981 tagged ways on 2026-09-05, which
 * contained all of: `NH34`, `NH 34`, `NH 334`, `SH8`, `SH 3`, `SH-12`, `SH09`, `NH34:NH707A`.
 * Treating those as distinct highways would list NH34 twice and invent a road called
 * "NH34:NH707A", so normalising is the whole job of this file.
 */

export type RoadNetwork = 'NH' | 'SH';

export interface RoadRef {
  network: RoadNetwork;
  /** Canonical form: `NH34`, `SH12`. */
  ref: string;
  /** The bare number with any suffix letter: `34`, `107A`. */
  number: string;
}

/**
 * A single `ref` value may name several concurrent highways, separated by `;`, `,` or `:`
 * where two routes share the same carriageway. Each is returned separately: a road carrying
 * both NH34 and NH707A belongs on both lists.
 */
export function parseRoadRefs(raw: string): RoadRef[] {
  const results: RoadRef[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/[;,:]/)) {
    const token = part.trim().toUpperCase();
    if (token.length === 0) continue;

    // `NH 334`, `SH-12`, `NH107A` — optional separator, digits, optional suffix letters.
    // Anchored at both ends so "Old NH 58" is rejected: a road tagged as an OLD alignment
    // is not the current highway and must not be listed as one.
    const match = /^(NH|SH)[\s-]?(\d+[A-Z]?)$/.exec(token);
    if (match === null) continue;

    const network = match[1] as RoadNetwork;
    // Strip leading zeros: the real extract contains both `SH9` and `SH09`, which are one
    // highway written two ways. Left alone they appear as two separate state highways.
    const number = (match[2] as string).replace(/^0+(?=\d)/, '');
    const ref = `${network}${number}`;

    if (seen.has(ref)) continue;
    seen.add(ref);
    results.push({ network, ref, number });
  }

  return results;
}

interface OverpassWay {
  tags?: unknown;
}

interface OverpassResponse {
  elements?: unknown;
}

/**
 * Collects the distinct highways from an Overpass way extract.
 *
 * Returned sorted by network then numerically — `NH7` before `NH34` before `NH107A`, which
 * is how a highway list is read. A plain string sort puts NH107 before NH7 and looks broken.
 */
export function collectRoadRefs(body: string): Result<RoadRef[], RequestError> {
  let parsed: OverpassResponse;
  try {
    parsed = JSON.parse(body) as OverpassResponse;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const elements = parsed.elements;
  // A busy Overpass mirror answers HTTP 200 with an HTML error page, so an unparseable or
  // shapeless body is how the connector detects it and fails over.
  if (!Array.isArray(elements)) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const byRef = new Map<string, RoadRef>();

  for (const element of elements as OverpassWay[]) {
    const tags = element.tags;
    if (typeof tags !== 'object' || tags === null) continue;

    const ref = (tags as { ref?: unknown }).ref;
    if (typeof ref !== 'string') continue;

    for (const road of parseRoadRefs(ref)) {
      if (!byRef.has(road.ref)) byRef.set(road.ref, road);
    }
  }

  if (byRef.size === 0) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  return ok(sortRoadRefs([...byRef.values()]));
}

export function sortRoadRefs(roads: readonly RoadRef[]): RoadRef[] {
  return [...roads].sort((a, b) => {
    if (a.network !== b.network) return a.network === 'NH' ? -1 : 1;

    const digitsA = Number.parseInt(a.number, 10);
    const digitsB = Number.parseInt(b.number, 10);
    if (digitsA !== digitsB) return digitsA - digitsB;

    // Same number, differing suffix: NH107 before NH107A before NH107B.
    return a.number.localeCompare(b.number);
  });
}
