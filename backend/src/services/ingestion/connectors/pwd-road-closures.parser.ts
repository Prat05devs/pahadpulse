import { err, ok, type Result } from 'neverthrow';

import { toMysqlUtcDatetime } from '../../../utils/datetime.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';

/**
 * Parsing for the PWD Uttarakhand road closure dashboard (`mis.pwduk.in/pwd/roadClosure`).
 *
 * The dashboard is a server-rendered HTML table, not an API. Every structure here was taken
 * from real fetches on 2026-09-26, trimmed into
 * `src/__tests__/fixtures/pwd-road-closures.sample.html`. What it taught:
 *
 *   1. Columns are found by their HEADER TEXT, not their position. The table carries a dozen
 *      unlabelled helper columns, and a reordered dashboard must fail loudly (a missing
 *      header is a parse error) rather than silently read the wrong column.
 *
 *   2. The "Informed By" column holds officials' names and ID numbers. It is personal data
 *      with no public purpose here, so this parser never reads it — nothing downstream can
 *      store what is never extracted.
 *
 *   3. Times are Indian Standard Time without a zone (`2026-09-26 08:58`), converted to UTC.
 *
 *   4. District names are PWD's own spellings: "Nanital", "Pauri", "Tehri". They are
 *      resolved against our 13 districts by `resolveDistrict`, never trusted verbatim.
 *
 *   5. A closure is identified by PWD's road id (the `[10478]` suffix on the road name) and
 *      the time it closed. NOT by "Closure No": that is a running count of the road's closures
 *      within the requested date window, so the same closure is numbered differently by
 *      different fetches (see migration 065).
 */

export type ClosureStatus = 'closed' | 'partially_closed' | 'partially_opened' | 'open' | 'unknown';

export interface ParsedRoadClosure {
  /** `${pwdRoadId}@${closedAt}` — the idempotency key. */
  sourceClosureKey: string;
  pwdRoadId: number;
  roadName: string;
  /**
   * The kilometre markers PWD highlights as blocked now, e.g. `7`. Null when none are.
   *
   * The dashboard's km cell lists every km where the road has had a closure WITHIN THE
   * REQUESTED WINDOW, and highlights in red the ones closed now. Only the highlighted ones are
   * kept: they are what a traveller needs, and unlike the full list they do not change with
   * the fetch window (which made every poll rewrite hundreds of unchanged rows).
   */
  kmMarkers: string | null;
  /** UTC, `YYYY-MM-DD HH:MM:SS`. */
  closedAt: string;
  /** UTC; PWD's own estimate, never a promise (RD-7). */
  expectedOpenAt: string | null;
  status: ClosureStatus;
  /** PWD's raw district text, kept for auditing the resolution. */
  districtRaw: string | null;
  division: string | null;
  /** NH, SH, MDR, ODR, VR, LVR… or null for PWD's "Unknown". */
  roadType: string | null;
  department: string | null;
}

export interface ParseReport {
  closures: ParsedRoadClosure[];
  rejected: number;
}

const REQUIRED_HEADERS = {
  road: 'name of road',
  km: 'km no',
  closedAt: 'road closed at',
  expectedOpen: 'expected time of open',
  status: 'status',
  division: 'division',
  district: 'district',
  roadType: 'road type',
  department: 'department',
} as const;

type HeaderKey = keyof typeof REQUIRED_HEADERS;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&nbsp;': ' ',
};

/** Tags stripped, entities decoded, whitespace collapsed. */
export function cellText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39|#039|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

/** The km numbers inside the red-highlighted spans of a km cell, joined with commas. */
export function blockedKmMarkers(cellHtml: string): string | null {
  const blocked = [
    ...cellHtml.matchAll(
      /<span[^>]*class\s*=\s*"[^"]*text-red-500[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    ),
  ]
    .map((match) => cellText(match[1] ?? ''))
    .filter((value) => value !== '');
  return blocked.length === 0 ? null : blocked.join(', ');
}

export function normaliseStatus(raw: string): ClosureStatus {
  const text = raw.toLowerCase();
  if (text.startsWith('partially closed')) return 'partially_closed';
  if (text.startsWith('partially opened') || text.startsWith('partially open')) {
    return 'partially_opened';
  }
  if (text.startsWith('closed')) return 'closed';
  if (text.startsWith('opened') || text.startsWith('open')) return 'open';
  return 'unknown';
}

/** `2026-09-26 08:58` in IST → `2026-09-26 03:28:00` UTC. Null when unparseable. */
export function istToUtc(raw: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
  if (match === null) return null;
  const [, date, hours, minutes, seconds] = match;
  return toMysqlUtcDatetime(`${date}T${hours}:${minutes}:${seconds ?? '00'}+05:30`);
}

function headerIndex(headers: readonly string[]): Record<HeaderKey, number> | null {
  const index = {} as Record<HeaderKey, number>;
  for (const [key, label] of Object.entries(REQUIRED_HEADERS) as [HeaderKey, string][]) {
    // The status header embeds its own filter list ("Status All 🔴 Closed …"), so match the
    // start. The first occurrence wins: the table repeats `department` as a helper column.
    const position = headers.findIndex((header) => header.toLowerCase().startsWith(label));
    if (position === -1) return null;
    index[key] = position;
  }
  return index;
}

const nullIfBlank = (value: string | undefined): string | null =>
  value === undefined || value === '' ? null : value;

export function parseRoadClosures(html: string): Result<ParseReport, RequestError> {
  const table = /<table[\s\S]*?<\/table>/i.exec(html)?.[0];
  if (table === undefined) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
    cellText(m[1] ?? ''),
  );
  const column = headerIndex(headers);
  if (column === null) return err(ERRORS.UPSTREAM_RESPONSE_INVALID);

  const closures: ParsedRoadClosure[] = [];
  let rejected = 0;

  for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rawCells = [...(row[1] ?? '').matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1] ?? '',
    );
    const cells = rawCells.map(cellText);
    if (cells.length === 0) continue; // the header row

    const roadCell = cells[column.road] ?? '';
    const idMatch = /\[(\d+)\]\s*$/.exec(roadCell);
    const closedAt = istToUtc(cells[column.closedAt] ?? '');
    if (idMatch === null || closedAt === null) {
      rejected += 1;
      continue;
    }

    const pwdRoadId = Number(idMatch[1]);
    const expectedRaw = cells[column.expectedOpen] ?? '';
    const roadType = nullIfBlank(cells[column.roadType]);

    closures.push({
      sourceClosureKey: `${pwdRoadId}@${closedAt}`,
      pwdRoadId,
      roadName: roadCell.replace(/\s*\[\d+\]\s*$/, ''),
      kmMarkers: blockedKmMarkers(rawCells[column.km] ?? ''),
      closedAt,
      expectedOpenAt: expectedRaw === '' ? null : istToUtc(expectedRaw),
      status: normaliseStatus(cells[column.status] ?? ''),
      districtRaw: nullIfBlank(cells[column.district]),
      division: nullIfBlank(cells[column.division]),
      roadType: roadType === null || roadType.toLowerCase() === 'unknown' ? null : roadType,
      department: nullIfBlank(cells[column.department]),
    });
  }

  return ok({ closures, rejected });
}

/** PWD's spellings that do not match ours letter for letter. */
const DISTRICT_ALIASES: Record<string, string> = {
  nanital: 'nainital',
  pauri: 'paurigarhwal',
  tehri: 'tehrigarhwal',
  usnagar: 'udhamsinghnagar',
};

const squash = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Our district id for PWD's district text, or null. Null is an honest answer — the closure
 * is still stored and served state-wide — never a guess at the nearest name.
 */
export function resolveDistrict(
  raw: string | null,
  districts: readonly { id: number; nameEn: string }[],
): number | null {
  if (raw === null) return null;
  const key = squash(raw);
  const wanted = DISTRICT_ALIASES[key] ?? key;
  return districts.find((district) => squash(district.nameEn) === wanted)?.id ?? null;
}
