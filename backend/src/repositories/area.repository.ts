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
import { describeError } from '../utils/describe-error.js';

const logger = createLogger('@area.repository');

/** Column list shared by every area SELECT. Never `SELECT *` on a list query. */
const AREA_COLUMNS = `
  a.id, a.type, a.code, a.slug, a.name_en, a.name_hi, a.parent_id,
  a.division, a.headquarters_en, a.headquarters_hi,
  ST_Y(a.centroid::geometry) AS centroid_lat,
  ST_X(a.centroid::geometry) AS centroid_lng,
  a.lgd_code, a.census_2011_code
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

/** A place node as OSM gives it, before any decision about which tehsil contains it. */
export interface CandidatePlace {
  osmId: number;
  name: string;
  nameHi: string | null;
  lat: number;
  lng: number;
}

export interface PlacementResult {
  placed: number;
  /** Fell inside no stored tehsil boundary. Reported, never guessed into the nearest one. */
  unplaced: number;
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
   * Replaces the ingested villages, placing each inside the tehsil whose boundary contains
   * it — in the database, using the spatial index, rather than in application code.
   */
  replaceVillagesByGeometry(
    places: readonly CandidatePlace[],
  ): Promise<Result<PlacementResult, RequestError>>;
  /**
   * Village names grouped by their tehsil, for one district. One query rather than N —
   * a district has up to ~1,500 villages across a dozen tehsils and per-tehsil queries
   * would be the classic N+1 on the busiest page in the product (Q5).
   */
  listVillagesByTehsil(districtId: number): Promise<Result<Map<number, string[]>, RequestError>>;
}

export interface TehsilRef {
  id: number;
  slug: string;
  nameEn: string;
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
      const { rows } = await db.query<DistrictWithCountsRow>(
        `SELECT ${AREA_COLUMNS},
                COALESCE(t.tehsil_count, 0)  AS tehsil_count,
                COALESCE(v.village_count, 0) AS village_count,
                (b.area_id IS NOT NULL)      AS has_boundary
           FROM ${AREAS_TABLE} a
           LEFT JOIN (
             SELECT parent_id, COUNT(*) AS tehsil_count
               FROM ${AREAS_TABLE}
              WHERE type = $1
              GROUP BY parent_id
           ) t ON t.parent_id = a.id
           LEFT JOIN (
             SELECT th.parent_id AS district_id, COUNT(*) AS village_count
               FROM ${AREAS_TABLE} vl
               JOIN ${AREAS_TABLE} th ON th.id = vl.parent_id
              WHERE vl.type = $2 AND th.type = $3
              GROUP BY th.parent_id
           ) v ON v.district_id = a.id
           LEFT JOIN ${AREA_BOUNDARIES_TABLE} b ON b.area_id = a.id
          WHERE a.type = $4
          ORDER BY a.name_en ASC, a.id ASC`,
        [AreaType.Tehsil, AreaType.Village, AreaType.Tehsil, AreaType.District],
      );
      return ok(rows.map(toDistrictSummary));
    } catch (error) {
      logger.error('listDistricts failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findBySlug(slug: string): Promise<Result<Area, RequestError>> {
    try {
      const { rows } = await db.query<AreaRow>(
        `SELECT ${AREA_COLUMNS} FROM ${AREAS_TABLE} a WHERE a.slug = $1 LIMIT 1`,
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
      const { rows } = await db.query<AreaRow>(
        `SELECT ${AREA_COLUMNS} FROM ${AREAS_TABLE} a WHERE a.type = $1 AND a.code = $2 LIMIT 1`,
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
      const { rows } = await db.query<AreaRow>(
        `SELECT ${AREA_COLUMNS}
           FROM ${AREAS_TABLE} a
          WHERE a.parent_id = $1 AND a.type = $2
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
      const { rows } = await db.query<AreaBoundaryRow>(
        `SELECT area_id,
                ST_AsGeoJSON(geom) AS geojson,
                ST_AsGeoJSON(simplified_geom) AS simplified_geojson,
                is_placeholder, source_note, updated_at
           FROM ${AREA_BOUNDARIES_TABLE}
          WHERE area_id = $1
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
      const { rows } = await db.query<MapLayerRow>(
        `SELECT id, layer_key, owner_module, name_en, name_hi,
                display_order, is_default_visible, is_available
           FROM ${MAP_LAYERS_TABLE}
          ORDER BY display_order ASC, id ASC`,
      );
      return ok(rows.map(toMapLayer));
    } catch (error) {
      logger.error('listMapLayers failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async countByType(type: AreaType): Promise<Result<number, RequestError>> {
    try {
      const { rows } = await db.query<AreaCountRow>(
        `SELECT COUNT(*) AS total FROM ${AREAS_TABLE} WHERE type = $1`,
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
      const { rows } = await db.query<AreaRow>(
        `SELECT ${AREA_COLUMNS}
           FROM ${AREAS_TABLE} a
          WHERE a.type = $1 AND LOWER(a.name_en) = ANY($2::text[])`,
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
      const { rows } = await db.query<DistrictBoundaryRow>(
        `SELECT a.id, a.slug, a.name_en, a.name_hi, a.division,
                ST_Y(a.centroid::geometry) AS centroid_lat,
                ST_X(a.centroid::geometry) AS centroid_lng,
                ST_AsGeoJSON(COALESCE(b.simplified_geom, b.geom)) AS geojson,
                b.is_placeholder, b.source_note
           FROM ${AREAS_TABLE} a
           JOIN ${AREA_BOUNDARIES_TABLE} b ON b.area_id = a.id
          WHERE a.type = $1
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
      logger.error('listDistrictBoundaries failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listDistrictNames(): Promise<Result<DistrictName[], RequestError>> {
    try {
      const { rows } = await db.query<DistrictNameRow>(
        `SELECT id, name_en, name_hi FROM ${AREAS_TABLE} WHERE type = $1 ORDER BY id ASC`,
        [AreaType.District],
      );
      return ok(rows.map((row) => ({ id: row.id, nameEn: row.name_en, nameHi: row.name_hi })));
    } catch (error) {
      logger.error('listDistrictNames failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listTehsils(): Promise<Result<TehsilRef[], RequestError>> {
    try {
      const { rows } = await db.query<AreaRow>(
        `SELECT id, slug, name_en FROM ${AREAS_TABLE} WHERE type = $1 ORDER BY id ASC`,
        [AreaType.Tehsil],
      );
      return ok(rows.map((row) => ({ id: row.id, slug: row.slug, nameEn: row.name_en })));
    } catch (error) {
      logger.error('listTehsils failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listVillagesByTehsil(districtId: number): Promise<Result<Map<number, string[]>, RequestError>> {
    try {
      const { rows } = await db.query<AreaRow>(
        `SELECT v.parent_id, v.name_en, v.name_hi, v.id, v.type, v.code, v.slug,
                v.division, v.headquarters_en, v.headquarters_hi,
                ST_Y(v.centroid::geometry) AS centroid_lat,
                ST_X(v.centroid::geometry) AS centroid_lng,
                v.lgd_code, v.census_2011_code
           FROM ${AREAS_TABLE} v
           JOIN ${AREAS_TABLE} t ON t.id = v.parent_id AND t.type = $1
          WHERE v.type = $2 AND t.parent_id = $3
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


  /**
   * Places every village by geometry, in SQL.
   *
   * This replaced a hand-rolled point-in-polygon pass in TypeScript: a ray cast per ring
   * with a bounding-box pre-filter, run for ~13,500 places against 78 tehsils. That code
   * was correct, but it was a spatial index reimplemented by hand — and it required every
   * tehsil polygon to be held in memory and re-parsed on every run.
   *
   * `ST_Covers` against the GIST index on `area_boundaries.geom` does the same test. Covers
   * rather than Contains deliberately: a village sitting exactly ON a tehsil border is
   * inside it for this purpose, whereas ST_Contains excludes the boundary and would drop it.
   *
   * The places go into a TEMP table first rather than one enormous VALUES list. Postgres
   * caps a statement at 65,535 parameters and there are five per place, so a single
   * statement could not carry them; staging also lets the planner see the real row count
   * before choosing how to join.
   */
  async replaceVillagesByGeometry(
    places: readonly CandidatePlace[],
  ): Promise<Result<PlacementResult, RequestError>> {
    if (places.length === 0) return ok({ placed: 0, unplaced: 0 });

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Dropped at COMMIT, so nothing survives the transaction.
      await client.query(`
        CREATE TEMP TABLE staged_places (
          osm_id   BIGINT PRIMARY KEY,
          name_en  VARCHAR(128) NOT NULL,
          name_hi  VARCHAR(128),
          point    geometry(Point, 4326) NOT NULL
        ) ON COMMIT DROP
      `);

      const CHUNK = 1000;
      for (let i = 0; i < places.length; i += CHUNK) {
        const chunk = places.slice(i, i + CHUNK);
        const params: unknown[] = [];
        const tuples: string[] = [];

        for (const place of chunk) {
          const base = params.length;
          // lng then lat — ST_MakePoint takes X before Y.
          params.push(place.osmId, place.name.slice(0, 128), place.nameHi?.slice(0, 128) ?? null,
            place.lng, place.lat);
          const p = (n: number) => `$${base + n}`;
          tuples.push(
            `(${p(1)}, ${p(2)}, ${p(3)}, ST_SetSRID(ST_MakePoint(${p(4)}, ${p(5)}), 4326))`,
          );
        }

        await client.query(
          `INSERT INTO staged_places (osm_id, name_en, name_hi, point) VALUES ${tuples.join(', ')}
           ON CONFLICT (osm_id) DO NOTHING`,
          params,
        );
      }

      // Only ingested rows are cleared. A curated village added by hand would not carry the
      // OSM prefix and must survive a re-run untouched.
      await client.query(`DELETE FROM ${AREAS_TABLE} WHERE type = $1 AND code LIKE 'OSM-V-%'`, [
        AreaType.Village,
      ]);

      /*
       * The placement itself. `DISTINCT ON (osm_id)` because a point on a shared border is
       * covered by both tehsils — the lower area id wins, deterministically, rather than the
       * row order deciding.
       *
       * Slugs are de-duplicated with ROW_NUMBER rather than a Set in application code:
       * village names repeat across the state, and the suffix has to be stable between runs
       * or every re-ingestion would renumber them.
       */
      const inserted = await client.query(
        `WITH covered AS (
           SELECT DISTINCT ON (s.osm_id)
                  s.osm_id, s.name_en, s.name_hi, s.point, t.id AS tehsil_id
             FROM staged_places s
             JOIN ${AREA_BOUNDARIES_TABLE} b ON ST_Covers(b.geom, s.point)
             JOIN ${AREAS_TABLE} t ON t.id = b.area_id AND t.type = $1
            ORDER BY s.osm_id, t.id
         ),
         slugged AS (
           SELECT c.*,
                  -- Mirrors the old JS: strip to ASCII, lowercase, hyphenate, fall back to
                  -- the OSM id when a name leaves nothing usable.
                  COALESCE(
                    NULLIF(regexp_replace(lower(regexp_replace(c.name_en, '[^[:ascii:]]', '', 'g')), '[^a-z0-9]+', '-', 'g'), ''),
                    'place-' || c.osm_id
                  ) AS stem,
                  ROW_NUMBER() OVER (
                    PARTITION BY COALESCE(
                      NULLIF(regexp_replace(lower(regexp_replace(c.name_en, '[^[:ascii:]]', '', 'g')), '[^a-z0-9]+', '-', 'g'), ''),
                      'place-' || c.osm_id
                    )
                    ORDER BY c.osm_id
                  ) AS n
             FROM covered c
         )
         INSERT INTO ${AREAS_TABLE} (type, code, slug, name_en, name_hi, parent_id, centroid)
         SELECT $2,
                'OSM-V-' || osm_id,
                left(
                  CASE WHEN n = 1 THEN 'v-' || btrim(stem, '-')
                       ELSE 'v-' || btrim(stem, '-') || '-' || n END,
                  128
                ),
                left(name_en, 128),
                left(name_hi, 128),
                tehsil_id,
                point::geography
           FROM slugged
         ON CONFLICT (slug) DO NOTHING`,
        [AreaType.Tehsil, AreaType.Village],
      );

      const placed = inserted.rowCount ?? 0;
      await client.query('COMMIT');

      return ok({ placed, unplaced: places.length - placed });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('replaceVillagesByGeometry failed', { count: places.length, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      client.release();
    }
  }

  async upsertBoundary(input: UpsertBoundaryInput): Promise<Result<void, RequestError>> {
    try {
      await db.query(
        /*
         * `ST_Multi` normalises a Polygon into a MultiPolygon so the column's type
         * constraint holds: Overpass returns a single ring for a district with no exclaves
         * and a multi for one with them, and rejecting the simple case would be absurd.
         */
        `INSERT INTO ${AREA_BOUNDARIES_TABLE}
           (area_id, geom, simplified_geom, is_placeholder, source_note)
         VALUES (
           $1,
           ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)),
           ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
           $4, $5
         )
         ON CONFLICT (area_id) DO UPDATE SET
           geom            = EXCLUDED.geom,
           simplified_geom = EXCLUDED.simplified_geom,
           is_placeholder  = EXCLUDED.is_placeholder,
           source_note     = EXCLUDED.source_note`,
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
