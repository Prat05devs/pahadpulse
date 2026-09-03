import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  AREA_BOUNDARIES_TABLE,
  AREAS_TABLE,
  MAP_LAYERS_TABLE,
  type Area,
  type AreaBoundary,
  type AreaBoundaryRow,
  type AreaCountRow,
  type AreaRow,
  type DistrictSummary,
  type DistrictWithCountsRow,
  type MapLayer,
  type MapLayerRow,
} from '../models/area.model.js';
import { AreaType } from '../types/area.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@area.repository');

/** Column list shared by every area SELECT. Never `SELECT *` on a list query. */
const AREA_COLUMNS = `
  a.id, a.type, a.code, a.slug, a.name_en, a.name_hi, a.parent_id,
  a.division, a.headquarters_en, a.headquarters_hi,
  a.centroid_lat, a.centroid_lng, a.lgd_code, a.census_2011_code
`;

function toArea(row: AreaRow): Area {
  const lat = row.centroid_lat;
  const lng = row.centroid_lng;
  return {
    id: row.id,
    type: row.type,
    code: row.code,
    slug: row.slug,
    name: { en: row.name_en, hi: row.name_hi },
    parentId: row.parent_id,
    division: row.division,
    headquarters:
      row.headquarters_en !== null && row.headquarters_hi !== null
        ? { en: row.headquarters_en, hi: row.headquarters_hi }
        : null,
    centroid: lat !== null && lng !== null ? { lat: Number(lat), lng: Number(lng) } : null,
    officialIds: { lgd: row.lgd_code, census2011: row.census_2011_code },
  };
}

function toDistrictSummary(row: DistrictWithCountsRow): DistrictSummary {
  return {
    ...toArea(row),
    counts: { tehsils: row.tehsil_count, villages: row.village_count },
    hasBoundary: Boolean(row.has_boundary),
  };
}

function toMapLayer(row: MapLayerRow): MapLayer {
  return {
    key: row.layer_key,
    ownerModule: row.owner_module,
    name: { en: row.name_en, hi: row.name_hi },
    displayOrder: row.display_order,
    isDefaultVisible: Boolean(row.is_default_visible),
    isAvailable: Boolean(row.is_available),
  };
}

export interface IAreaRepository {
  listDistricts(): Promise<Result<DistrictSummary[], RequestError>>;
  findBySlug(slug: string): Promise<Result<Area, RequestError>>;
  findByCode(type: AreaType, code: string): Promise<Result<Area, RequestError>>;
  listChildren(parentId: number, type: AreaType): Promise<Result<Area[], RequestError>>;
  findBoundaryByAreaId(areaId: number): Promise<Result<AreaBoundary, RequestError>>;
  listMapLayers(): Promise<Result<MapLayer[], RequestError>>;
  countByType(type: AreaType): Promise<Result<number, RequestError>>;
  /**
   * Resolves free-text place names (as an upstream feed names them in prose) onto
   * districts, by case-insensitive exact match against `name_en`. Built for `alerts`,
   * whose CAP feed names places in prose rather than by our codes — see alerts.md
   * "Used by other modules via".
   */
  resolveToDistricts(names: readonly string[]): Promise<Result<Area[], RequestError>>;
}

class AreaRepositoryImpl implements IAreaRepository {
  /**
   * All 13 districts with child counts, in one query.
   *
   * The counts come from correlated aggregates rather than N follow-up queries (Q5).
   * There are 13 districts by definition, so this is bounded and unpaginated.
   */
  async listDistricts(): Promise<Result<DistrictSummary[], RequestError>> {
    try {
      const [rows] = await db.query<DistrictWithCountsRow[]>(
        `SELECT ${AREA_COLUMNS},
                COALESCE(t.tehsil_count, 0)  AS tehsil_count,
                COALESCE(v.village_count, 0) AS village_count,
                (b.area_id IS NOT NULL)      AS has_boundary
           FROM ${AREAS_TABLE} a
           LEFT JOIN (
             SELECT parent_id, COUNT(*) AS tehsil_count
               FROM ${AREAS_TABLE}
              WHERE type = ?
              GROUP BY parent_id
           ) t ON t.parent_id = a.id
           LEFT JOIN (
             SELECT th.parent_id AS district_id, COUNT(*) AS village_count
               FROM ${AREAS_TABLE} vl
               JOIN ${AREAS_TABLE} th ON th.id = vl.parent_id
              WHERE vl.type = ? AND th.type = ?
              GROUP BY th.parent_id
           ) v ON v.district_id = a.id
           LEFT JOIN ${AREA_BOUNDARIES_TABLE} b ON b.area_id = a.id
          WHERE a.type = ?
          ORDER BY a.name_en ASC, a.id ASC`,
        [AreaType.Tehsil, AreaType.Village, AreaType.Tehsil, AreaType.District],
      );
      return ok(rows.map(toDistrictSummary));
    } catch (error) {
      logger.error('listDistricts failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findBySlug(slug: string): Promise<Result<Area, RequestError>> {
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT ${AREA_COLUMNS} FROM ${AREAS_TABLE} a WHERE a.slug = ? LIMIT 1`,
        [slug],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.AREA_NOT_FOUND);
      return ok(toArea(row));
    } catch (error) {
      logger.error('findBySlug failed', { slug, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findByCode(type: AreaType, code: string): Promise<Result<Area, RequestError>> {
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT ${AREA_COLUMNS} FROM ${AREAS_TABLE} a WHERE a.type = ? AND a.code = ? LIMIT 1`,
        [type, code],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.AREA_NOT_FOUND);
      return ok(toArea(row));
    } catch (error) {
      logger.error('findByCode failed', { type, code, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listChildren(parentId: number, type: AreaType): Promise<Result<Area[], RequestError>> {
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT ${AREA_COLUMNS}
           FROM ${AREAS_TABLE} a
          WHERE a.parent_id = ? AND a.type = ?
          ORDER BY a.name_en ASC, a.id ASC
          LIMIT 5000`,
        [parentId, type],
      );
      return ok(rows.map(toArea));
    } catch (error) {
      logger.error('listChildren failed', { parentId, type, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findBoundaryByAreaId(areaId: number): Promise<Result<AreaBoundary, RequestError>> {
    try {
      const [rows] = await db.query<AreaBoundaryRow[]>(
        `SELECT area_id, geojson, simplified_geojson, is_placeholder, source_note, updated_at
           FROM ${AREA_BOUNDARIES_TABLE}
          WHERE area_id = ?
          LIMIT 1`,
        [areaId],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.BOUNDARY_NOT_AVAILABLE);

      // Prefer the simplified geometry: the map never receives full precision (GEO-5).
      const geometry = row.simplified_geojson ?? row.geojson;
      return ok({
        areaId: row.area_id,
        geojson: typeof geometry === 'string' ? (JSON.parse(geometry) as unknown) : geometry,
        isPlaceholder: Boolean(row.is_placeholder),
        sourceNote: row.source_note,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      logger.error('findBoundaryByAreaId failed', { areaId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listMapLayers(): Promise<Result<MapLayer[], RequestError>> {
    try {
      const [rows] = await db.query<MapLayerRow[]>(
        `SELECT id, layer_key, owner_module, name_en, name_hi,
                display_order, is_default_visible, is_available
           FROM ${MAP_LAYERS_TABLE}
          ORDER BY display_order ASC, id ASC`,
      );
      return ok(rows.map(toMapLayer));
    } catch (error) {
      logger.error('listMapLayers failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async countByType(type: AreaType): Promise<Result<number, RequestError>> {
    try {
      const [rows] = await db.query<AreaCountRow[]>(
        `SELECT COUNT(*) AS total FROM ${AREAS_TABLE} WHERE type = ?`,
        [type],
      );
      return ok(rows[0]?.total ?? 0);
    } catch (error) {
      logger.error('countByType failed', { type, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async resolveToDistricts(names: readonly string[]): Promise<Result<Area[], RequestError>> {
    if (names.length === 0) return ok([]);
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT ${AREA_COLUMNS}
           FROM ${AREAS_TABLE} a
          WHERE a.type = ? AND LOWER(a.name_en) IN (?)`,
        [AreaType.District, names.map((name) => name.toLowerCase())],
      );
      return ok(rows.map(toArea));
    } catch (error) {
      logger.error('resolveToDistricts failed', { names, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const AreaRepository: IAreaRepository = new AreaRepositoryImpl();
