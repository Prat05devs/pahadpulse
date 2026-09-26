import { err, ok, type Result } from 'neverthrow';

import { PWD_ROAD_CLOSURES } from '../../../config/constants.js';
import { AreaRepository } from '../../../repositories/area.repository.js';
import {
  RoadClosureRepository,
  type UpsertRoadClosureInput,
} from '../../../repositories/road-closure.repository.js';
import { toMysqlUtcDatetime } from '../../../utils/datetime.js';
import type { RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import { parseRoadClosures, resolveDistrict } from './pwd-road-closures.parser.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` on the Indian calendar — the dashboard's date filters are IST dates. */
export function istDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(instant);
}

/**
 * The fetch window. It always reaches back to the oldest road we still hold as not open, so
 * that road's reopening is seen on the very next poll — a closure is never left showing as
 * closed merely because it started before a short window (the misinformation this source
 * must not create). Bounded below by a week and above by a year.
 */
export function fetchWindow(
  now: Date,
  oldestUnopenedClosedAt: string | null,
): { from: string; to: string } {
  const to = istDate(now);
  if (oldestUnopenedClosedAt === null) {
    return {
      from: istDate(new Date(now.getTime() - PWD_ROAD_CLOSURES.INITIAL_WINDOW_DAYS * DAY_MS)),
      to,
    };
  }
  const oldest = new Date(`${oldestUnopenedClosedAt.replace(' ', 'T')}Z`);
  const floor = now.getTime() - PWD_ROAD_CLOSURES.MAX_WINDOW_DAYS * DAY_MS;
  const ceiling = now.getTime() - PWD_ROAD_CLOSURES.MIN_WINDOW_DAYS * DAY_MS;
  // One day of slack before the oldest closure, for the IST/UTC boundary.
  const from = Math.max(floor, Math.min(ceiling, oldest.getTime() - DAY_MS));
  return { from: istDate(new Date(from)), to };
}

/**
 * PWD Uttarakhand's road closure dashboard.
 *
 * Seeded disabled and non-redistributable (migration 064) until PWD grants reproduction
 * permission; the runner skips it while `is_enabled` is false. See the parser for the page
 * structure and the personal-data rule.
 */
class PwdRoadClosuresConnector implements SourceConnector {
  readonly sourceKey = 'pwd-uk-road-closures';
  readonly ownerModule = 'roads';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const oldest = await RoadClosureRepository.oldestUnopenedClosedAt(context.sourceId);
    if (oldest.isErr()) return err(oldest.error);

    const window = fetchWindow(context.now, oldest.value);
    const url = new URL(PWD_ROAD_CLOSURES.URL);
    url.searchParams.set('base_date', window.from);
    url.searchParams.set('current_date', window.to);

    const html = await fetchText(url.toString(), {
      timeoutMs: PWD_ROAD_CLOSURES.FETCH_TIMEOUT_MS,
      retries: PWD_ROAD_CLOSURES.FETCH_RETRIES,
      headers: { 'user-agent': PWD_ROAD_CLOSURES.USER_AGENT },
    });
    if (html.isErr()) return err(html.error);

    const parsed = parseRoadClosures(html.value);
    if (parsed.isErr()) return err(parsed.error);

    const districts = await AreaRepository.listDistrictNames();
    if (districts.isErr()) return err(districts.error);

    // Keyed so a closure listed twice cannot hit the same row twice in one upsert.
    const byKey = new Map<string, UpsertRoadClosureInput>();
    let unresolvedDistricts = 0;
    for (const closure of parsed.value.closures) {
      const areaId = resolveDistrict(closure.districtRaw, districts.value);
      if (areaId === null) unresolvedDistricts += 1;
      byKey.set(closure.sourceClosureKey, {
        sourceClosureKey: closure.sourceClosureKey,
        pwdRoadId: closure.pwdRoadId,
        roadName: closure.roadName,
        kmMarkers: closure.kmMarkers,
        roadType: closure.roadType,
        department: closure.department,
        division: closure.division,
        districtRaw: closure.districtRaw,
        areaId,
        status: closure.status,
        closedAt: closure.closedAt,
        expectedOpenAt: closure.expectedOpenAt,
      });
    }

    const seenAt = toMysqlUtcDatetime(context.now.toISOString()) ?? context.now.toISOString();
    const written = await RoadClosureRepository.upsertMany(
      context.sourceId,
      [...byKey.values()],
      seenAt,
    );
    if (written.isErr()) return err(written.error);

    const notOpen = [...byKey.values()].filter((closure) => closure.status !== 'open').length;
    return ok({
      rowsWritten: written.value,
      rowsRejected: parsed.value.rejected,
      vintage: window.to,
      notes:
        `Window ${window.from} to ${window.to}: ${byKey.size} closure(s) read, ${notOpen} not open, ` +
        `${written.value} row(s) written, ${parsed.value.rejected} rejected, ` +
        `${unresolvedDistricts} without a matching district.`,
    });
  }
}

export const pwdRoadClosuresConnector: SourceConnector = new PwdRoadClosuresConnector();
