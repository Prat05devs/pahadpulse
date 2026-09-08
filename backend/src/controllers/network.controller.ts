import { err, ok, type Result } from 'neverthrow';

import {
  toNetworkPerformance,
  type ConnectionKind,
  type DistrictNetwork,
  type NetworkPerformance,
  type NetworkPerformanceRow,
} from '../models/network.model.js';
import type { Provenance } from '../models/source.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { NetworkRepository } from '../repositories/network.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { RequestError } from '../utils/errors.js';

type Stamped = NetworkPerformance & { provenance: Provenance | null };

/** The spread across districts for one connection type, computed from what is served. */
export interface KindSpread {
  kind: ConnectionKind;
  fastest: { slug: string; downloadMbps: number };
  slowest: { slug: string; downloadMbps: number };
  /**
   * Fastest over slowest. The single number this page exists to show: a district-level
   * ratio is the difference a resident actually meets, and it is invisible in a state
   * average. Not a judgement about why.
   */
  ratio: number;
  /** Weighted by tests, so a district with 261 samples does not swing the state figure. */
  stateAverageMbps: number;
  districtsMeasured: number;
}

export interface StateNetwork {
  quarterStart: string | null;
  districts: DistrictNetwork[];
  spread: KindSpread[];
  /**
   * Districts with no measurement at all this quarter. Named rather than dropped, for the
   * same reason the migration list keeps all thirteen rows.
   */
  notMeasured: Array<{ slug: string; name: { en: string; hi: string | null } }>;
}

function group(rows: NetworkPerformanceRow[], stamped: Stamped[]): DistrictNetwork[] {
  const byDistrict = new Map<string, DistrictNetwork>();
  rows.forEach((row, index) => {
    const figure = stamped[index];
    // DS-6: a figure whose source forbids redistribution never reaches a response, and so
    // never reaches the spread computed from these either.
    if (figure === undefined || publiclyDisplayable([figure]).length === 0) return;

    const existing = byDistrict.get(row.area_slug) ?? {
      slug: row.area_slug,
      name: { en: row.area_name_en, hi: row.area_name_hi ?? row.area_name_en },
      connections: [],
    };
    existing.connections.push(figure);
    byDistrict.set(row.area_slug, existing);
  });
  return [...byDistrict.values()];
}

function spreadFor(districts: DistrictNetwork[], kind: ConnectionKind): KindSpread | null {
  const entries = districts.flatMap((district) =>
    district.connections
      .filter((connection) => connection.kind === kind)
      .map((connection) => ({ slug: district.slug, connection })),
  );
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b.connection.downloadMbps - a.connection.downloadMbps);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  if (fastest === undefined || slowest === undefined) return null;

  const tests = entries.reduce((sum, entry) => sum + entry.connection.sample.tests, 0);
  const weighted = entries.reduce(
    (sum, entry) => sum + entry.connection.downloadMbps * entry.connection.sample.tests,
    0,
  );

  return {
    kind,
    fastest: { slug: fastest.slug, downloadMbps: fastest.connection.downloadMbps },
    slowest: { slug: slowest.slug, downloadMbps: slowest.connection.downloadMbps },
    ratio:
      slowest.connection.downloadMbps === 0
        ? 0
        : Number((fastest.connection.downloadMbps / slowest.connection.downloadMbps).toFixed(1)),
    stateAverageMbps: tests === 0 ? 0 : Number((weighted / tests).toFixed(1)),
    districtsMeasured: entries.length,
  };
}

/** Measured internet performance for every district in the most recent quarter. */
export async function listStateNetwork(now?: Date): Promise<Result<StateNetwork, RequestError>> {
  const rows = await NetworkRepository.listLatest();
  if (rows.isErr()) return err(rows.error);

  const stamped = await attachProvenance(rows.value.map(toNetworkPerformance), now);
  if (stamped.isErr()) return err(stamped.error);

  const districts = group(rows.value, stamped.value);

  const all = await AreaRepository.listDistricts();
  if (all.isErr()) return err(all.error);
  const measured = new Set(districts.map((district) => district.slug));

  const spread = (['fixed', 'mobile'] as const)
    .map((kind) => spreadFor(districts, kind))
    .filter((entry): entry is KindSpread => entry !== null);

  return ok({
    quarterStart: rows.value[0]?.quarter_start ?? null,
    districts,
    spread,
    notMeasured: all.value
      .filter((district) => !measured.has(district.slug))
      .map((district) => ({ slug: district.slug, name: district.name })),
  });
}

/** One district's measurements, newest quarter first. */
export async function getAreaNetwork(
  areaSlug: string,
  now?: Date,
): Promise<Result<DistrictNetwork, RequestError>> {
  // Resolved first so an unknown slug 404s rather than returning an empty district.
  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  const rows = await NetworkRepository.listForArea(areaSlug);
  if (rows.isErr()) return err(rows.error);

  const stamped = await attachProvenance(rows.value.map(toNetworkPerformance), now);
  if (stamped.isErr()) return err(stamped.error);

  const districts = group(rows.value, stamped.value);
  return ok(
    districts[0] ?? {
      slug: area.value.slug,
      name: area.value.name,
      connections: [],
    },
  );
}
