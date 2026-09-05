import { err, ok, type Result } from 'neverthrow';

import type { Area, AreaBoundary, DistrictSummary, MapLayer } from '../models/area.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { AreaType } from '../types/area.js';
import { ERRORS, type RequestError } from '../utils/errors.js';

/** Area types a client may address by slug. Villages are addressed through their tehsil. */
const PUBLIC_AREA_TYPES: readonly AreaType[] = [AreaType.State, AreaType.District, AreaType.Tehsil];

export interface TehsilWithVillages extends Area {
  /** Village names inside this tehsil, alphabetical. Empty where none are mapped yet. */
  villages: string[];
}

export interface DistrictDetail {
  district: Area;
  tehsils: TehsilWithVillages[];
  boundary: AreaBoundary | null;
}

export async function listDistricts(): Promise<Result<DistrictSummary[], RequestError>> {
  return AreaRepository.listDistricts();
}

export async function getAreaBySlug(slug: string): Promise<Result<Area, RequestError>> {
  const area = await AreaRepository.findBySlug(slug);
  if (area.isErr()) return err(area.error);

  if (!PUBLIC_AREA_TYPES.includes(area.value.type)) {
    return err(ERRORS.AREA_TYPE_NOT_SUPPORTED);
  }
  return ok(area.value);
}

/**
 * A district plus its tehsils and boundary in one response.
 *
 * The boundary is optional rather than fatal: a district with no boundary yet still renders
 * from its centroid, so a missing polygon degrades the map instead of failing the page
 * (geography.md §7).
 */
export async function getDistrictDetail(
  slug: string,
): Promise<Result<DistrictDetail, RequestError>> {
  const area = await AreaRepository.findBySlug(slug);
  if (area.isErr()) return err(area.error);

  const district = area.value;
  if (district.type !== AreaType.District) {
    return err(ERRORS.AREA_TYPE_NOT_SUPPORTED);
  }

  const tehsils = await AreaRepository.listChildren(district.id, AreaType.Tehsil);
  if (tehsils.isErr()) return err(tehsils.error);

  // Villages are best-effort: a failure here must not cost the page its tehsils, which are
  // curated reference data and always present.
  const villages = await AreaRepository.listVillagesByTehsil(district.id);
  const villagesByTehsil = villages.isOk() ? villages.value : new Map<number, string[]>();

  const boundary = await AreaRepository.findBoundaryByAreaId(district.id);
  if (boundary.isErr() && boundary.error.code !== ERRORS.BOUNDARY_NOT_AVAILABLE.code) {
    return err(boundary.error);
  }

  return ok({
    district,
    tehsils: tehsils.value.map((tehsil) => ({
      ...tehsil,
      villages: villagesByTehsil.get(tehsil.id) ?? [],
    })),
    boundary: boundary.isOk() ? boundary.value : null,
  });
}

export async function getAreaBoundary(slug: string): Promise<Result<AreaBoundary, RequestError>> {
  const area = await AreaRepository.findBySlug(slug);
  if (area.isErr()) return err(area.error);
  return AreaRepository.findBoundaryByAreaId(area.value.id);
}

export async function listAreaChildren(
  slug: string,
  childType: AreaType,
): Promise<Result<Area[], RequestError>> {
  const area = await AreaRepository.findBySlug(slug);
  if (area.isErr()) return err(area.error);
  return AreaRepository.listChildren(area.value.id, childType);
}

export async function listMapLayers(): Promise<Result<MapLayer[], RequestError>> {
  return AreaRepository.listMapLayers();
}
