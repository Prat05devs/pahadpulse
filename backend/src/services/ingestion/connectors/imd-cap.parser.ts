import { XMLParser } from 'fast-xml-parser';
import { err, ok, type Result } from 'neverthrow';

import { AlertCertainty, AlertSeverity, AlertType, AlertUrgency } from '../../../types/alert.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';

/**
 * Parsing for the IMD CAP feed at cap-sources.s3.amazonaws.com/in-imd-en/rss.xml.
 *
 * Every field name and structure here was taken from a real fetch of the feed and one of
 * its linked CAP documents on 2026-09-03 (saved as
 * `src/__tests__/fixtures/imd-cap-index.sample.xml` and `imd-cap-alert.sample.xml`), not
 * invented from the CAP spec in the abstract. The feed is a two-stage structure:
 *
 *   1. The RSS index (`rss.channel.item[]`) — title, link, guid, pubDate. No severity, no
 *      area, no expiry: just enough to know a full CAP document exists and where it is.
 *   2. Each item's `<link>` points to the actual CAP 1.2 document, digitally signed
 *      (XML-DSig — we read the alert content and ignore the signature block).
 *
 * `parseTagValue: false` is deliberate: the parser must never guess that a text node is a
 * number. Every field here is handled as a string and converted explicitly.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

export interface CapIndexItem {
  link: string;
  guid: string;
  pubDate: string;
}

interface RssIndexShape {
  rss?: { channel?: { item?: unknown } };
}

export function parseCapIndex(xml: string): Result<CapIndexItem[], RequestError> {
  let parsed: RssIndexShape;
  try {
    parsed = parser.parse(xml) as RssIndexShape;
  } catch {
    return err(ERRORS.UPSTREAM_RESPONSE_INVALID);
  }

  const rawItems = parsed.rss?.channel?.item;
  if (rawItems === undefined) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const result: CapIndexItem[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const { link, guid, pubDate } = item as Record<string, unknown>;
    if (typeof link !== 'string' || typeof guid !== 'string') continue;
    result.push({ link, guid, pubDate: typeof pubDate === 'string' ? pubDate : '' });
  }

  return ok(result);
}

export interface ParsedCapArea {
  areaDesc: string;
}

export interface ParsedCapAlert {
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msgType: string;
  scope: string;
  language: string;
  category: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  onset: string | null;
  expires: string | null;
  senderName: string;
  headline: string;
  description: string;
  instruction: string | null;
  web: string | null;
  areas: ParsedCapArea[];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseCapAlert(xml: string): Result<ParsedCapAlert, RequestError> {
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

  // CAP allows multiple <info> blocks (typically one per language). This feed is
  // English-only; take the first block present rather than assume there is exactly one.
  const infoBlocks = asArray(alert.info as Record<string, unknown> | Record<string, unknown>[]);
  const info = infoBlocks[0];
  if (info === undefined) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const headline = asString(info.headline);
  const description = asString(info.description);
  if (headline === null || description === null) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const rawAreas = asArray(info.area as Record<string, unknown> | Record<string, unknown>[]);
  const areas: ParsedCapArea[] = rawAreas
    .map((area) => asString(area.areaDesc))
    .filter((desc): desc is string => desc !== null)
    .map((areaDesc) => ({ areaDesc }));

  return ok({
    identifier,
    sender: asString(alert.sender) ?? '',
    sent,
    status: asString(alert.status) ?? 'Unknown',
    msgType: asString(alert.msgType) ?? 'Unknown',
    scope: asString(alert.scope) ?? 'Unknown',
    language: asString(info.language) ?? 'en',
    category: asString(info.category) ?? '',
    event: asString(info.event) ?? '',
    urgency: asString(info.urgency) ?? 'Unknown',
    severity: asString(info.severity) ?? 'Unknown',
    certainty: asString(info.certainty) ?? 'Unknown',
    onset: asString(info.onset),
    expires: asString(info.expires),
    senderName: asString(info.senderName) ?? asString(alert.sender) ?? '',
    headline,
    description,
    instruction: asString(info.instruction),
    web: asString(info.web),
    areas,
  });
}

// --- normalization: CAP's own scales, mapped onto ours without re-interpretation ---

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  minor: AlertSeverity.Minor,
  moderate: AlertSeverity.Moderate,
  severe: AlertSeverity.Severe,
  extreme: AlertSeverity.Extreme,
};

export function normalizeSeverity(raw: string): AlertSeverity {
  return SEVERITY_MAP[raw.toLowerCase()] ?? AlertSeverity.Unknown;
}

const URGENCY_MAP: Record<string, AlertUrgency> = {
  immediate: AlertUrgency.Immediate,
  expected: AlertUrgency.Expected,
  future: AlertUrgency.Future,
  past: AlertUrgency.Past,
};

export function normalizeUrgency(raw: string): AlertUrgency {
  return URGENCY_MAP[raw.toLowerCase()] ?? AlertUrgency.Unknown;
}

const CERTAINTY_MAP: Record<string, AlertCertainty> = {
  observed: AlertCertainty.Observed,
  likely: AlertCertainty.Likely,
  possible: AlertCertainty.Possible,
  unlikely: AlertCertainty.Unlikely,
};

export function normalizeCertainty(raw: string): AlertCertainty {
  return CERTAINTY_MAP[raw.toLowerCase()] ?? AlertCertainty.Unknown;
}

/**
 * Best-effort classification from free text. IMD's CAP category is always "Met" — it does
 * not distinguish flood/river/road warnings from general weather warnings, so this reads
 * the event/headline/description for keywords. This is a disclosed heuristic, not a fact
 * from the source: when nothing matches, it falls back to Weather, the category the source
 * actually asserts.
 */
export function classifyAlertType(event: string, headline: string, description: string): AlertType {
  const text = `${event} ${headline} ${description}`.toLowerCase();
  if (/\bflood\b|\bflash flood\b/.test(text)) return AlertType.Flood;
  if (/\briver\b|\bwater level\b/.test(text)) return AlertType.River;
  if (/\blandslide\b|\bcyclone\b|\bearthquake\b/.test(text)) return AlertType.Disaster;
  if (/\broad\b|\bhighway\b/.test(text)) return AlertType.Road;
  return AlertType.Weather;
}

/**
 * Matches CAP `areaDesc` text against Uttarakhand. IMD's meteorological subdivisions treat
 * Uttarakhand as a single subdivision (there is no finer state-internal breakdown in this
 * feed), so this is necessarily a state-level match, not a district-level one — see
 * `districtNamesIn` below for the (currently unused in practice) district-level path.
 */
export function isRelevantToUttarakhand(areaDescs: readonly string[]): boolean {
  return areaDescs.some((desc) => /uttarakhand|uttaranchal/i.test(desc));
}

/** Any area description that literally names one of our districts, for AreaRepository.resolveToDistricts. */
export function districtNameCandidates(areaDescs: readonly string[]): string[] {
  return [...areaDescs];
}
