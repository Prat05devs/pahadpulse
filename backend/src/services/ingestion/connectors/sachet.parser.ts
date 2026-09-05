import { XMLParser } from 'fast-xml-parser';
import { err, ok, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from '../../../utils/errors.js';
import { parseCapPolygon, type Geometry, type Position } from '../../../utils/geojson.js';

/**
 * Parsing for SACHET, the NDMA national CAP alert aggregator.
 *
 * Every structure here was taken from real fetches on 2026-09-04, saved as
 * `src/__tests__/fixtures/sachet-uk-index.sample.xml`, `sachet-alert.sample.xml` and
 * `sachet-polygon.sample.xml`. SACHET is CAP 1.2 like IMD, but it differs in four ways that
 * each cost a real behaviour here — this file exists rather than reusing `imd-cap.parser`
 * because of them:
 *
 *   1. `<cap:description/>` is EMPTY on every document seen. `imd-cap.parser` treats a
 *      missing description as a parse failure, which is right for that feed and would reject
 *      100% of this one. Here the headline carries the content and the body falls back to it.
 *
 *   2. There are TWO `<cap:info>` blocks per alert — one `en-IN`, one `HI` — carrying the
 *      same warning. See `selectInfo` for which one wins and why.
 *
 *   3. `areaDesc` is useless for resolving districts: it reads "districts of uttarakhand".
 *      The district names are in the HEADLINE ("...over Uttarkashi, Almora, Bageshwar..."),
 *      so `findDistrictsInText` scans that instead.
 *
 *   4. Polygons live in a SEPARATE document, and are duplicated once per language block, so
 *      identical rings have to be de-duplicated before they become a MultiPolygon.
 *
 * `parseTagValue: false` for the same reason as the IMD parser: the parser must never guess
 * that a text node is a number. A CAP identifier is a digit string and would silently become
 * a float in scientific notation.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

export interface SachetIndexItem {
  /** SACHET's own numeric identifier, from `<guid>`. Keys both follow-up fetches. */
  identifier: string;
  link: string;
  title: string;
  /** e.g. "controlroom@ndma.gov.in (IMD Dehradun)" — the issuing office. */
  author: string;
  pubDate: string;
}

interface RssShape {
  rss?: { channel?: { item?: unknown } };
}

export function parseSachetIndex(xml: string): Result<SachetIndexItem[], RequestError> {
  let parsed: RssShape;
  try {
    parsed = parser.parse(xml) as RssShape;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const channel = parsed.rss?.channel;
  if (channel === undefined) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  // An empty state feed is a valid state of the world — no active warnings — not a parse
  // failure. It must produce an empty list, never an error, or a quiet day looks like an
  // outage in the ingestion health board.
  const rawItems = channel.item;
  if (rawItems === undefined) return ok([]);

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const result: SachetIndexItem[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;

    // `<guid isPermaLink="false">123</guid>` parses to an object once attributes are kept,
    // with the element's text under `#text`.
    const guid = record.guid;
    let identifier = '';
    if (typeof guid === 'string') {
      identifier = guid;
    } else if (typeof guid === 'object' && guid !== null) {
      const text = (guid as Record<string, unknown>)['#text'];
      if (typeof text === 'string') identifier = text;
    }

    const link = record.link;
    if (identifier.length === 0 || typeof link !== 'string') continue;

    result.push({
      identifier,
      link,
      title: typeof record.title === 'string' ? record.title : '',
      author: typeof record.author === 'string' ? record.author : '',
      pubDate: typeof record.pubDate === 'string' ? record.pubDate : '',
    });
  }

  return ok(result);
}

export interface SachetInfoBlock {
  language: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  onset: string | null;
  effective: string | null;
  expires: string | null;
  headline: string;
  description: string;
  instruction: string | null;
  areaDesc: string;
}

export interface SachetAlert {
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msgType: string;
  scope: string;
  infos: SachetInfoBlock[];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** `en-IN` and `HI` both appear; normalise to a bare lowercase tag for the `language` column. */
export function normalizeLanguage(raw: string): string {
  const base = raw.split('-')[0]?.toLowerCase() ?? '';
  return base.length === 0 ? 'en' : base;
}

export function parseSachetAlert(xml: string): Result<SachetAlert, RequestError> {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const alert = (parsed as { alert?: Record<string, unknown> } | null)?.alert;
  if (alert === undefined || alert === null) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const identifier = asString(alert.identifier);
  const sent = asString(alert.sent);
  if (identifier === null || sent === null) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const infoBlocks = asArray(alert.info as Record<string, unknown> | Record<string, unknown>[]);
  const infos: SachetInfoBlock[] = [];

  for (const info of infoBlocks) {
    const headline = asString(info.headline);
    // The headline is the one field with no fallback: an alert whose text we cannot read is
    // not something to display to someone in a landslide zone.
    if (headline === null) continue;

    const areas = asArray(info.area as Record<string, unknown> | Record<string, unknown>[]);

    infos.push({
      language: normalizeLanguage(asString(info.language) ?? 'en'),
      event: asString(info.event) ?? '',
      urgency: asString(info.urgency) ?? 'Unknown',
      severity: asString(info.severity) ?? 'Unknown',
      certainty: asString(info.certainty) ?? 'Unknown',
      onset: asString(info.onset),
      effective: asString(info.effective),
      expires: asString(info.expires),
      headline,
      // Empty on every SACHET document seen — see the header note (1).
      description: asString(info.description) ?? headline,
      instruction: asString(info.instruction),
      areaDesc: asString(areas[0]?.areaDesc) ?? '',
    });
  }

  if (infos.length === 0) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  return ok({
    identifier,
    sender: asString(alert.sender) ?? '',
    sent,
    status: asString(alert.status) ?? 'Unknown',
    msgType: asString(alert.msgType) ?? 'Unknown',
    scope: asString(alert.scope) ?? 'Unknown',
    infos,
  });
}

/**
 * Picks the one `<cap:info>` block to store, preferring English.
 *
 * This is a deliberate departure from the global constraint "where a source publishes both
 * languages, both are stored as separate rows", and it is recorded here because it is the
 * kind of thing that otherwise looks like an oversight.
 *
 * Storing both would need two rows for one `cap:identifier`, which collides head-on with
 * ALR-1 — an alert is upserted by the source's own identifier precisely so that one warning
 * is never represented by two rows. Two rows would also double every alert in the public
 * list and in the active-alert count on the home dashboard.
 *
 * So: one row, English preferred, and `language` records which one it is. Nothing is
 * translated (ALR-2) — the Hindi block is dropped, not merged. When an alert has only a
 * Hindi block, the Hindi text is stored as-is and the English locale must display it with
 * its language marked rather than hide the warning.
 */
export function selectInfo(infos: readonly SachetInfoBlock[]): SachetInfoBlock | null {
  return infos.find((info) => info.language === 'en') ?? infos[0] ?? null;
}

interface PolygonDocShape {
  alert?: { polygon?: unknown };
}

/**
 * Parses the separate polygon document into one geometry.
 *
 * SACHET repeats every polygon once per language block, so the same ring arrives two or four
 * times. De-duplicating is not cosmetic: without it a MultiPolygon contains overlapping
 * identical rings, which renders as a doubled fill and roughly doubles the payload.
 */
export function parseSachetPolygons(xml: string): Result<Geometry | null, RequestError> {
  let parsed: PolygonDocShape;
  try {
    parsed = parser.parse(xml) as PolygonDocShape;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const raw = parsed.alert?.polygon;
  // Not every alert has geometry, and that is not an error — see migration 010's header.
  if (raw === undefined) return ok(null);

  const values = (Array.isArray(raw) ? raw : [raw]).filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  if (values.length === 0) return ok(null);

  const rings: Position[][] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalised = value.trim().replace(/\s+/g, ' ');
    if (seen.has(normalised)) continue;
    seen.add(normalised);

    const polygon = parseCapPolygon(normalised);
    // One malformed ring must not discard the rings that did parse: a partial affected area
    // drawn correctly beats no affected area at all.
    if (polygon.isErr()) continue;

    const ring = polygon.value.coordinates[0];
    if (ring !== undefined) rings.push(ring);
  }

  if (rings.length === 0) return ok(null);
  if (rings.length === 1) return ok({ type: 'Polygon', coordinates: [rings[0] as Position[]] });

  return ok({ type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) });
}

export interface DistrictNameCandidate {
  id: number;
  nameEn: string;
  nameHi: string;
}

/**
 * Finds which of our districts a free-text alert names.
 *
 * SACHET's `areaDesc` says "districts of uttarakhand" — it never names them. The districts
 * are listed in the headline instead, in prose: "...is likely to occur at a few places over
 * Uttarkashi, Almora, Bageshwar, Chamoli...". This is therefore substring matching on
 * curated reference names, not a parse of a structured field, and it is a disclosed
 * heuristic exactly like `classifyAlertType`.
 *
 * Both `name_en` and `name_hi` are matched because roughly half this feed's Uttarakhand
 * alerts are Hindi-only.
 */
export function findDistrictsInText(
  text: string,
  districts: readonly DistrictNameCandidate[],
): number[] {
  const haystack = text.toLowerCase();
  const matched: number[] = [];

  for (const district of districts) {
    const en = district.nameEn.toLowerCase();
    if (haystack.includes(en) || text.includes(district.nameHi)) {
      matched.push(district.id);
      continue;
    }

    // "Pauri Garhwal" and "Tehri Garhwal" are routinely written as bare "Pauri" and "Tehri".
    // Only the leading word is tried, and only when it is distinctive enough to be safe on
    // its own — a three-letter fragment would match far too much.
    const firstWord = en.split(' ')[0];
    if (firstWord !== undefined && firstWord.length >= 5 && haystack.includes(firstWord)) {
      matched.push(district.id);
    }
  }

  return matched;
}
