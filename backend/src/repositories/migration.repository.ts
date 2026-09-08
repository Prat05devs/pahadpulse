import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  CATEGORIES_TABLE,
  FIGURES_TABLE,
  OBSERVATIONS_TABLE,
  SURVEYS_TABLE,
  isShareDimension,
  toSurvey,
  type MigrationBreakdown,
  type MigrationDimension,
  type MigrationFigures,
  type MigrationSurvey,
} from '../models/migration.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@migration.repository');

interface FigureRow {
  survey_key: string;
  area_slug: string;
  temporary_persons: number;
  temporary_panchayats: number;
  permanent_persons: number;
  permanent_panchayats: number;
  blocks_reporting: number | null;
}

interface ObservationRow {
  survey_key: string;
  area_slug: string;
  dimension: MigrationDimension;
  category_key: string;
  label_en: string;
  label_hi: string;
  note_en: string | null;
  /** NUMERIC arrives as a string; the driver never narrows it. */
  value: string;
}

/** Figures and breakdowns for one district, keyed by survey. */
export interface DistrictMigration {
  figures: Map<string, MigrationFigures>;
  breakdowns: Map<string, MigrationBreakdown[]>;
}

export interface IMigrationRepository {
  /** Both survey rounds, oldest first. */
  listSurveys(): Promise<Result<MigrationSurvey[], RequestError>>;
  /** One district's figures and breakdowns across every round that surveyed it. */
  findForArea(areaSlug: string): Promise<Result<DistrictMigration, RequestError>>;
  /** Headline counts for every district in every round — the state view and comparisons. */
  listFigures(): Promise<Result<Map<string, Map<string, MigrationFigures>>, RequestError>>;
}

function toFigures(row: FigureRow): MigrationFigures {
  return {
    surveyKey: row.survey_key,
    temporaryPersons: row.temporary_persons,
    temporaryPanchayats: row.temporary_panchayats,
    permanentPersons: row.permanent_persons,
    permanentPanchayats: row.permanent_panchayats,
    blocksReporting: row.blocks_reporting,
  };
}

class MigrationRepositoryImpl implements IMigrationRepository {
  private static readonly FIGURE_SELECT = `
    SELECT s.survey_key, a.slug AS area_slug,
           f.temporary_persons, f.temporary_panchayats,
           f.permanent_persons, f.permanent_panchayats, f.blocks_reporting
      FROM ${FIGURES_TABLE} f
      JOIN ${SURVEYS_TABLE} s ON s.id = f.survey_id
      JOIN areas a ON a.id = f.area_id`;

  async listSurveys(): Promise<Result<MigrationSurvey[], RequestError>> {
    try {
      const { rows } = await db.query(
        `SELECT id, survey_key, label_en, label_hi, covers_from, covers_to, published_on,
                gram_panchayats_surveyed, blocks_surveyed, source_id, evidence_url,
                updated_at AS fetched_at
           FROM ${SURVEYS_TABLE}
          ORDER BY covers_to`,
      );
      return ok(rows.map(toSurvey));
    } catch (error) {
      logger.error('listSurveys failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Breakdowns are ordered by the dimension and then by the category's printed position,
   * never by value. A chart that sorted by value would move "lack of healthcare" to a
   * different slot in every district, which is precisely what makes two districts hard to
   * read side by side.
   */
  async findForArea(areaSlug: string): Promise<Result<DistrictMigration, RequestError>> {
    try {
      const { rows: figureRows } = await db.query<FigureRow>(
        `${MigrationRepositoryImpl.FIGURE_SELECT}
          WHERE a.slug = $1
          ORDER BY s.covers_to`,
        [areaSlug],
      );

      const { rows: obsRows } = await db.query<ObservationRow>(
        `SELECT s.survey_key, a.slug AS area_slug, c.dimension, c.category_key,
                c.label_en, c.label_hi, c.note_en, o.value
           FROM ${OBSERVATIONS_TABLE} o
           JOIN ${SURVEYS_TABLE} s ON s.id = o.survey_id
           JOIN ${CATEGORIES_TABLE} c ON c.category_key = o.category_key
           JOIN areas a ON a.id = o.area_id
          WHERE a.slug = $1
          ORDER BY s.covers_to, c.dimension, c.sort_order`,
        [areaSlug],
      );

      const figures = new Map<string, MigrationFigures>();
      for (const row of figureRows) figures.set(row.survey_key, toFigures(row));

      const breakdowns = new Map<string, MigrationBreakdown[]>();
      for (const row of obsRows) {
        const list = breakdowns.get(row.survey_key) ?? [];
        let group = list.find((entry) => entry.dimension === row.dimension);
        if (group === undefined) {
          group = {
            dimension: row.dimension,
            isShare: isShareDimension(row.dimension),
            values: [],
          };
          list.push(group);
        }
        group.values.push({
          categoryKey: row.category_key,
          label: { en: row.label_en, hi: row.label_hi },
          note: row.note_en,
          value: Number(row.value),
        });
        breakdowns.set(row.survey_key, list);
      }

      return ok({ figures, breakdowns });
    } catch (error) {
      logger.error('findForArea failed', { areaSlug, error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listFigures(): Promise<Result<Map<string, Map<string, MigrationFigures>>, RequestError>> {
    try {
      const { rows } = await db.query<FigureRow>(
        `${MigrationRepositoryImpl.FIGURE_SELECT} ORDER BY a.slug, s.covers_to`,
      );

      const byArea = new Map<string, Map<string, MigrationFigures>>();
      for (const row of rows) {
        const bySurvey = byArea.get(row.area_slug) ?? new Map<string, MigrationFigures>();
        bySurvey.set(row.survey_key, toFigures(row));
        byArea.set(row.area_slug, bySurvey);
      }
      return ok(byArea);
    } catch (error) {
      logger.error('listFigures failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const MigrationRepository: IMigrationRepository = new MigrationRepositoryImpl();
