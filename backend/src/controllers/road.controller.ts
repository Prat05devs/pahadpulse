import { err, ok, type Result } from 'neverthrow';

import type { RoadRouteOut } from '../models/road.model.js';
import { RoadRepository } from '../repositories/road.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { RequestError } from '../utils/errors.js';

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
  now?: Date
): Promise<Result<RoadNetworkSummary, RequestError>> {
  const routes = await RoadRepository.listRoutes();
  if (routes.isErr()) return err(routes.error);

  const stamped = await attachProvenance(
    routes.value.map((route) => ({ ...route, vintage: route.vintage })),
    now
  );
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value);

  return ok({
    national: visible.filter((route) => route.network === 'NH'),
    state: visible.filter((route) => route.network === 'SH'),
    isCrowdSourced: true,
  });
}
