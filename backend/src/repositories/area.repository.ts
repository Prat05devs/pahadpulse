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
  type DistrictBoundary,
  type DistrictBoundaryRow,
  type DistrictName,
  type DistrictNameRow,
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
  /**
   * Every district with its simplified boundary, for the map's district layer. Bounded at 13
   * rows by definition, so unpaginated — one request draws the whole state.
   */
  listDistrictBoundaries(): Promise<Result<DistrictBoundary[], RequestError>>;
  /** The district reference names a connector matches free-text alert prose against. */
  listDistrictNames(): Promise<Result<DistrictName[], RequestError>>;
  /**
   * Replaces one area's boundary. Idempotent by area id (DS-5): re-running the boundary
   * connector updates in place and never accumulates rows.
   */
  upsertBoundary(input: UpsertBoundaryInput): Promise<Result<void, RequestError>>;
  /** Every tehsil with the district it belongs to, for placing ingested villages. */
  listTehsils(): Promise<Result<TehsilRef[], RequestError>>;
  /**
   * Village names grouped by their tehsil, for one district. One query rather than N —
   * a district has up to ~1,500 villages across a dozen tehsils and per-tehsil queries
   * would be the classic N+1 on the busiest page in the product (Q5).
   */
  listVillagesByTehsil(districtId: number): Promise<Result<Map<number, string[]>, RequestError>>;
  /**
   * Replaces every ingested village in one transaction. Ingested places are identified by an
   * `OSM-` code prefix so a re-run never touches curated rows (DS-5).
   */
  replaceIngestedVillages(villages: readonly IngestedVillage[]): Promise<Result<number, RequestError>>;
}

export interface TehsilRef {
  id: number;
  slug: string;
  nameEn: string;
}

export interface IngestedVillage {
  code: string;
  slug: string;
  nameEn: string;
  nameHi: string | null;
  parentId: number;
  lat: number;
  lng: number;
}

export interface UpsertBoundaryInput {
  areaId: number;
  /** Full precision, as fetched. Stored but never served. */
  geojson: unknown;
  /** What the API serves to the map. */
  simplifiedGeojson: unknown;
  isPlaceholder: boolean;
  sourceNote: string;
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

  async listDistrictBoundaries(): Promise<Result<DistrictBoundary[], RequestError>> {
    try {
      const [rows] = await db.query<DistrictBoundaryRow[]>(
        `SELECT a.id, a.slug, a.name_en, a.name_hi, a.division,
                a.centroid_lat, a.centroid_lng,
                COALESCE(b.simplified_geojson, b.geojson) AS geojson,
                b.is_placeholder, b.source_note
           FROM ${AREAS_TABLE} a
           JOIN ${AREA_BOUNDARIES_TABLE} b ON b.area_id = a.id
          WHERE a.type = ?
          ORDER BY a.name_en ASC, a.id ASC`,
        [AreaType.District],
      );

      return ok(
        rows.map((row) => ({
          areaId: row.id,
          slug: row.slug,
          name: { en: row.name_en, hi: row.name_hi },
          division: row.division,
          centroid:
            row.centroid_lat !== null && row.centroid_lng !== null
              ? { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) }
              : null,
          geojson: typeof row.geojson === 'string' ? (JSON.parse(row.geojson) as unknown) : row.geojson,
          isPlaceholder: Boolean(row.is_placeholder),
          sourceNote: row.source_note,
        })),
      );
    } catch (error) {
      logger.error('listDistrictBoundaries failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listDistrictNames(): Promise<Result<DistrictName[], RequestError>> {
    try {
      const [rows] = await db.query<DistrictNameRow[]>(
        `SELECT id, name_en, name_hi FROM ${AREAS_TABLE} WHERE type = ? ORDER BY id ASC`,
        [AreaType.District],
      );
      return ok(rows.map((row) => ({ id: row.id, nameEn: row.name_en, nameHi: row.name_hi })));
    } catch (error) {
      logger.error('listDistrictNames failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listTehsils(): Promise<Result<TehsilRef[], RequestError>> {
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT id, slug, name_en FROM ${AREAS_TABLE} WHERE type = ? ORDER BY id ASC`,
        [AreaType.Tehsil],
      );
      return ok(rows.map((row) => ({ id: row.id, slug: row.slug, nameEn: row.name_en })));
    } catch (error) {
      logger.error('listTehsils failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listVillagesByTehsil(districtId: number): Promise<Result<Map<number, string[]>, RequestError>> {
    try {
      const [rows] = await db.query<AreaRow[]>(
        `SELECT v.parent_id, v.name_en, v.name_hi, v.id, v.type, v.code, v.slug,
                v.division, v.headquarters_en, v.headquarters_hi,
                v.centroid_lat, v.centroid_lng, v.lgd_code, v.census_2011_code
           FROM ${AREAS_TABLE} v
           JOIN ${AREAS_TABLE} t ON t.id = v.parent_id AND t.type = ?
          WHERE v.type = ? AND t.parent_id = ?
          ORDER BY v.name_en ASC`,
        [AreaType.Tehsil, AreaType.Village, districtId],
      );

      const grouped = new Map<number, string[]>();
      for (const row of rows) {
        const parentId = row.parent_id;
        if (parentId === null) continue;
        const list = grouped.get(parentId) ?? [];
        list.push(row.name_en);
        grouped.set(parentId, list);
      }
      return ok(grouped);
    } catch (error) {
      logger.error('listVillagesByTehsil failed', { districtId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async replaceIngestedVillages(
    villages: readonly IngestedVillage[],
  ): Promise<Result<number, RequestError>> {
    if (villages.length === 0) return ok(0);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Only ingested rows are cleared. A curated village added by hand would not carry the
      // OSM prefix and must survive a re-run untouched.
      await connection.query(
        `DELETE FROM ${AREAS_TABLE} WHERE type = ? AND code LIKE 'OSM-V-%'`,
        [AreaType.Village],
      );

      // Chunked: a single 13,000-row INSERT exceeds max_allowed_packet on a default MySQL.
      const CHUNK = 1000;
      for (let i = 0; i < villages.length; i += CHUNK) {
        const chunk = villages.slice(i, i + CHUNK);
        await connection.query(
          `INSERT INTO ${AREAS_TABLE} (type, code, slug, name_en, name_hi, parent_id, centroid_lat, centroid_lng)
           VALUES ?`,
          [
            chunk.map((village) => [
              AreaType.Village,
              village.code,
              village.slug,
              village.nameEn,
              village.nameHi,
              village.parentId,
              village.lat,
              village.lng,
            ]),
          ],
        );
      }

      await connection.commit();
      return ok(villages.length);
    } catch (error) {
      await connection.rollback();
      logger.error('replaceIngestedVillages failed', { count: villages.length, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      connection.release();
    }
  }

  async upsertBoundary(input: UpsertBoundaryInput): Promise<Result<void, RequestError>> {
    try {
      await db.query(
        `INSERT INTO ${AREA_BOUNDARIES_TABLE}
           (area_id, geojson, simplified_geojson, is_placeholder, source_note)
         VALUES (?, ?, ?, ?, ?)
         AS new
         ON DUPLICATE KEY UPDATE
           geojson            = new.geojson,
           simplified_geojson = new.simplified_geojson,
           is_placeholder     = new.is_placeholder,
           source_note        = new.source_note`,
        [
          input.areaId,
          JSON.stringify(input.geojson),
          JSON.stringify(input.simplifiedGeojson),
          input.isPlaceholder,
          input.sourceNote,
        ],
      );
      return ok(undefined);
    } catch (error) {
      logger.error('upsertBoundary failed', { areaId: input.areaId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const AreaRepository: IAreaRepository = new AreaRepositoryImpl();
