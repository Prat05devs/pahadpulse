import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  INDICATOR_VALUES_TABLE,
  INDICATORS_TABLE,
  toIndicator,
  type AreaIndicatorValue,
  type Indicator,
  type IndicatorRow,
  type IndicatorWithValueRow,
  type MaxVintageRow,
  type RankingEntry,
  type RankingRow,
  type SeriesPoint,
  type SeriesPointRow,
} from '../models/indicator.model.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@indicator.repository');

const INDICATOR_COLUMNS = `
  i.id, i.indicator_key, i.category, i.scope, i.label_en, i.label_hi,
  i.unit, i.decimals, i.higher_is_better
`;

function toValuePoint(row: IndicatorWithValueRow): AreaIndicatorValue {
  return {
    indicator: toIndicator(row),
    value: Number(row.value),
    vintage: row.vintage,
    sourceId: row.source_id,
    fetchedAt: row.fetched_at,
  };
}

export interface RankingCursor {
  /** Rank of the last row on the previous page. 0 for the first page. */
  cursor: number;
  limit: number;
}

export interface RankingPage {
  data: RankingEntry[];
  pagination: { hasNext: boolean; nextCursor: number | null };
}

export interface IIndicatorRepository {
  listCatalogue(category?: string): Promise<Result<Indicator[], RequestError>>;
  findByKey(key: string): Promise<Result<Indicator, RequestError>>;
  latestValuesForArea(areaId: number): Promise<Result<AreaIndicatorValue[], RequestError>>;
  seriesForAreaIndicator(
    indicatorKey: string,
    areaId: number,
  ): Promise<Result<SeriesPoint[], RequestError>>;
  latestVintageFor(indicatorKey: string): Promise<Result<string | null, RequestError>>;
  ranking(
    indicator: Indicator,
    vintage: string,
    page: RankingCursor,
  ): Promise<Result<RankingPage, RequestError>>;
}

class IndicatorRepositoryImpl implements IIndicatorRepository {
  async listCatalogue(category?: string): Promise<Result<Indicator[], RequestError>> {
    try {
      const filterByCategory = category !== undefined;
      const { rows } = await db.query<IndicatorRow>(
        `SELECT ${INDICATOR_COLUMNS}
           FROM ${INDICATORS_TABLE} i
          ${filterByCategory ? 'WHERE i.category = $1' : ''}
          ORDER BY i.category ASC, i.indicator_key ASC`,
        filterByCategory ? [category] : [],
      );
      return ok(rows.map(toIndicator));
    } catch (error) {
      logger.error('listCatalogue failed', { category, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findByKey(key: string): Promise<Result<Indicator, RequestError>> {
    try {
      const { rows } = await db.query<IndicatorRow>(
        `SELECT ${INDICATOR_COLUMNS} FROM ${INDICATORS_TABLE} i WHERE i.indicator_key = $1 LIMIT 1`,
        [key],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.INDICATOR_NOT_FOUND);
      return ok(toIndicator(row));
    } catch (error) {
      logger.error('findByKey failed', { key, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * The latest value per indicator for one area, joined to the catalogue.
   *
   * The `MAX(vintage)` subquery is unambiguous rather than a window function: the fact
   * table's PK is (indicator_key, area_id, vintage), so at most one row exists per
   * indicator at that vintage for this area — no tie to break.
   *
   * Indicators outside this area's scope never appear: the inner join only returns
   * indicators that actually HAVE a stored value for this specific area_id, and a value
   * is only ever inserted against an area of the indicator's own scope.
   */
  async latestValuesForArea(areaId: number): Promise<Result<AreaIndicatorValue[], RequestError>> {
    try {
      const { rows } = await db.query<IndicatorWithValueRow>(
        `SELECT ${INDICATOR_COLUMNS}, v.value, v.vintage, v.source_id, v.fetched_at
           FROM ${INDICATORS_TABLE} i
           JOIN ${INDICATOR_VALUES_TABLE} v ON v.indicator_key = i.indicator_key
           JOIN (
             SELECT indicator_key, MAX(vintage) AS max_vintage
               FROM ${INDICATOR_VALUES_TABLE}
              WHERE area_id = $1
              GROUP BY indicator_key
           ) latest ON latest.indicator_key = v.indicator_key AND latest.max_vintage = v.vintage
          WHERE v.area_id = $2
          ORDER BY i.category ASC, i.indicator_key ASC`,
        [areaId, areaId],
      );
      return ok(rows.map(toValuePoint));
    } catch (error) {
      logger.error('latestValuesForArea failed', { areaId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async seriesForAreaIndicator(
    indicatorKey: string,
    areaId: number,
  ): Promise<Result<SeriesPoint[], RequestError>> {
    try {
      const { rows } = await db.query<SeriesPointRow>(
        `SELECT value, vintage, source_id, fetched_at
           FROM ${INDICATOR_VALUES_TABLE}
          WHERE indicator_key = $1 AND area_id = $2
          ORDER BY vintage ASC`,
        [indicatorKey, areaId],
      );
      return ok(
        rows.map((row) => ({
          value: Number(row.value),
          vintage: row.vintage,
          sourceId: row.source_id,
          fetchedAt: row.fetched_at,
        })),
      );
    } catch (error) {
      logger.error('seriesForAreaIndicator failed', { indicatorKey, areaId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /** The most recent vintage that has at least one value for this indicator, or null. */
  async latestVintageFor(indicatorKey: string): Promise<Result<string | null, RequestError>> {
    try {
      const { rows } = await db.query<MaxVintageRow>(
        `SELECT MAX(vintage) AS max_vintage FROM ${INDICATOR_VALUES_TABLE} WHERE indicator_key = $1`,
        [indicatorKey],
      );
      return ok(rows[0]?.max_vintage ?? null);
    } catch (error) {
      logger.error('latestVintageFor failed', { indicatorKey, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * All areas of the indicator's own scope with a value at exactly this vintage (IND-6).
   *
   * Ranked and paginated in application code rather than SQL: the row count here is bounded
   * by the area count at this scope (13 districts today), nowhere near the "large table"
   * threshold that would call for a cursor pushed down into SQL
   * (guidelines/backend/12-pagination.md). Ordered by value in the direction
   * `higherIsBetter` implies; ties break on area name for a stable, deterministic order.
   */
  async ranking(
    indicator: Indicator,
    vintage: string,
    page: RankingCursor,
  ): Promise<Result<RankingPage, RequestError>> {
    try {
      const { rows } = await db.query<RankingRow>(
        `SELECT v.area_id, a.slug AS area_slug, a.name_en AS area_name_en, a.name_hi AS area_name_hi,
                v.value, v.vintage, v.source_id, v.fetched_at
           FROM ${INDICATOR_VALUES_TABLE} v
           JOIN areas a ON a.id = v.area_id AND a.type = $1
          WHERE v.indicator_key = $2 AND v.vintage = $3`,
        [indicator.scope, indicator.key, vintage],
      );

      const ascending = indicator.higherIsBetter === false;
      const sorted = [...rows].sort((a, b) => {
        const diff = Number(a.value) - Number(b.value);
        if (diff !== 0) return ascending ? diff : -diff;
        return a.area_name_en.localeCompare(b.area_name_en);
      });

      const ranked: RankingEntry[] = sorted.map((row, index) => ({
        rank: index + 1,
        value: Number(row.value),
        vintage: row.vintage,
        sourceId: row.source_id,
        fetchedAt: row.fetched_at,
        area: {
          id: row.area_id,
          slug: row.area_slug,
          name: { en: row.area_name_en, hi: row.area_name_hi },
        },
      }));

      const remaining = ranked.filter((entry) => entry.rank > page.cursor);
      const hasNext = remaining.length > page.limit;
      const data = hasNext ? remaining.slice(0, page.limit) : remaining;
      const last = data.at(-1);

      return ok({
        data,
        pagination: { hasNext, nextCursor: hasNext && last !== undefined ? last.rank : null },
      });
    } catch (error) {
      logger.error('ranking failed', { indicatorKey: indicator.key, vintage, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const IndicatorRepository: IIndicatorRepository = new IndicatorRepositoryImpl();
