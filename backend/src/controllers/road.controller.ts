import { err, ok, type Result } from 'neverthrow';

import { PWD_ROAD_CLOSURES } from '../config/constants.js';
import { toRoadClosure, type RoadClosureOut } from '../models/road-closure.model.js';
import type { RoadRouteOut } from '../models/road.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { RoadClosureRepository } from '../repositories/road-closure.repository.js';
import { RoadRepository } from '../repositories/road.repository.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import { toIsoUtc, toMysqlUtcDatetime } from '../utils/datetime.js';
import { ERRORS, type RequestError } from '../utils/errors.js';

const PWD_ROAD_CLOSURES_SOURCE_KEY = 'pwd-uk-road-closures';

export interface RoadNetworkSummary {
  national: RoadRouteOut[];
  state: RoadRouteOut[];
  /**
   * Stated explicitly rather than left for the client to infer. This list is what OSM
   * contributors have tagged, and a road register from a crowd-sourced map is a different
   * kind of claim from one issued by NHAI — the UI is expected to say so.
   */
  isCrowdSourced: true;
}

/**
 * The highway network, split by network type.
 *
 * Runs through the same DS-6 redistribution filter as every other public read, so a source
 * whose terms change stops being served here without a code change.
 */
export async function listRoadNetwork(
  now?: Date,
): Promise<Result<RoadNetworkSummary, RequestError>> {
  const routes = await RoadRepository.listRoutes();
  if (routes.isErr()) return err(routes.error);

  const stamped = await attachProvenance(
    routes.value.map((route) => ({ ...route, vintage: route.vintage })),
    now,
  );
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value);

  return ok({
    national: visible.filter((route) => route.network === 'NH'),
    state: visible.filter((route) => route.network === 'SH'),
    isCrowdSourced: true,
  });
}

export type RoadClosuresUnavailableReason = 'not_permitted' | 'never_checked' | 'stale';

export interface RoadClosuresReport {
  /**
   * False whenever the list must not be read as the current state of the roads — the source
   * is not cleared for display, has never been checked, or its last check is too old. The
   * lists are then empty, and an empty list is NEVER "no closures" (RD-1).
   */
  available: boolean;
  unavailableReason: RoadClosuresUnavailableReason | null;
  /** When the last successful check against PWD started. ISO-8601 UTC. */
  checkedAt: string | null;
  closures: RoadClosureOut[];
  /** Open now after closing or reopening in the last 24 hours. */
  recentlyReopened: RoadClosureOut[];
  source: { department: string; url: string; attribution: string };
}

/** Closures as reported to PWD, optionally for one district. */
export async function listRoadClosures(
  districtSlug: string | null,
  now: Date = new Date(),
): Promise<Result<RoadClosuresReport, RequestError>> {
  const source = await SourceRepository.findByKey(PWD_ROAD_CLOSURES_SOURCE_KEY, now);
  if (source.isErr()) return err(source.error);
  const row = await SourceRepository.findRowByKey(PWD_ROAD_CLOSURES_SOURCE_KEY);
  if (row.isErr()) return err(row.error);

  let areaId: number | null = null;
  if (districtSlug !== null) {
    const area = await AreaRepository.findBySlug(districtSlug);
    if (area.isErr()) return err(area.error);
    areaId = area.value.id;
  }

  const base = {
    checkedAt: toIsoUtc(source.value.lastSuccessAt),
    closures: [],
    recentlyReopened: [],
    source: {
      department: source.value.department.en,
      url: source.value.url,
      attribution: source.value.attribution,
    },
  };

  if (!source.value.mayRedistribute) {
    return ok({ ...base, available: false, unavailableReason: 'not_permitted' });
  }
  const checkedAt = base.checkedAt === null ? null : new Date(base.checkedAt);
  if (checkedAt === null) {
    return ok({ ...base, available: false, unavailableReason: 'never_checked' });
  }
  if (now.getTime() - checkedAt.getTime() > PWD_ROAD_CLOSURES.MAX_DISPLAY_AGE_MS) {
    return ok({ ...base, available: false, unavailableReason: 'stale' });
  }

  // A closure counts as current only if the latest check saw it (with a little slack for the
  // run's own clock); one PWD dropped from the dashboard stops being shown, not "opened".
  const confirmedSince = toMysqlUtcDatetime(
    new Date(checkedAt.getTime() - 2 * 60 * 1000).toISOString(),
  );
  const reopenedSince = toMysqlUtcDatetime(
    new Date(now.getTime() - PWD_ROAD_CLOSURES.REOPENED_LOOKBACK_MS).toISOString(),
  );
  if (confirmedSince === null || reopenedSince === null) return err(ERRORS.INTERNAL_SERVER_ERROR);

  const listed = await RoadClosureRepository.listForDisplay({
    sourceId: row.value.id,
    confirmedSince,
    reopenedSince,
    areaId,
  });
  if (listed.isErr()) return err(listed.error);

  return ok({
    ...base,
    available: true,
    unavailableReason: null,
    closures: listed.value.current.map((closure) => toRoadClosure(closure, now)),
    recentlyReopened: listed.value.recentlyReopened.map((closure) => toRoadClosure(closure, now)),
  });
}
