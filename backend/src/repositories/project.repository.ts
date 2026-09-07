import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  PROJECTS_TABLE,
  PROJECT_AREAS_TABLE,
  type Project,
  type ProjectRow,
  toProject,
} from '../models/project.model.js';
import type { LocalisedText } from '../models/alert.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@project.repository');

interface AreaJoinRow {
  project_id: number;
  slug: string;
  name_en: string;
  name_hi: string;
  is_primary: boolean;
}

export interface IProjectRepository {
  /** Every project, newest activity first. The register is small by design. */
  listAll(): Promise<Result<Project[], RequestError>>;
  /** Projects touching one district, whether they sit in it or serve it. */
  listForArea(areaSlug: string): Promise<Result<Project[], RequestError>>;
}

class ProjectRepositoryImpl implements IProjectRepository {
  /**
   * Areas are fetched in a second query and stitched, rather than joined and de-duplicated
   * in JS. A project spans several districts, so a single join multiplies the project rows
   * and every scalar column would have to be collapsed back — which is where a
   * many-to-many join quietly turns one expressway into two.
   */
  private async attachAreas(rows: ProjectRow[]): Promise<Project[]> {
    if (rows.length === 0) return [];

    const { rows: areaRows } = await db.query<AreaJoinRow>(
      `SELECT pa.project_id, a.slug, a.name_en, a.name_hi, pa.is_primary
         FROM ${PROJECT_AREAS_TABLE} pa
         JOIN areas a ON a.id = pa.area_id
        WHERE pa.project_id = ANY($1::integer[])
        ORDER BY pa.is_primary DESC, a.name_en`,
      [rows.map((row) => row.id)],
    );

    const byProject = new Map<number, Array<{ slug: string; name: LocalisedText; isPrimary: boolean }>>();
    for (const area of areaRows) {
      const list = byProject.get(area.project_id) ?? [];
      list.push({
        slug: area.slug,
        name: { en: area.name_en, hi: area.name_hi },
        isPrimary: area.is_primary,
      });
      byProject.set(area.project_id, list);
    }

    return rows.map((row) => toProject(row, byProject.get(row.id) ?? []));
  }

  /**
   * Ordered by the most recent date the project has, whichever that is.
   *
   * A register sorted on one column strands everything else: sorting by completion buries
   * projects under construction, and sorting by announcement buries the expressway that
   * just opened. `COALESCE` down the three dates puts each project at its own latest
   * milestone, which is the order a reader scanning for momentum expects.
   */
  private static readonly SELECT = `
    SELECT id, slug, name_en, name_hi, sector, status, confidence, summary_en, summary_hi,
           capital_cost_cr, announced_on, expected_on, completed_on,
           source_id, evidence_url, verified_on, updated_at AS fetched_at
      FROM ${PROJECTS_TABLE}`;

  private static readonly ORDER = `
     ORDER BY COALESCE(completed_on, expected_on, announced_on) DESC NULLS LAST, name_en`;

  async listAll(): Promise<Result<Project[], RequestError>> {
    try {
      const { rows } = await db.query<ProjectRow>(
        `${ProjectRepositoryImpl.SELECT}${ProjectRepositoryImpl.ORDER}`,
      );
      return ok(await this.attachAreas(rows));
    } catch (error) {
      logger.error('listAll failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listForArea(areaSlug: string): Promise<Result<Project[], RequestError>> {
    try {
      const { rows } = await db.query<ProjectRow>(
        `${ProjectRepositoryImpl.SELECT}
          WHERE id IN (
            SELECT pa.project_id
              FROM ${PROJECT_AREAS_TABLE} pa
              JOIN areas a ON a.id = pa.area_id
             WHERE a.slug = $1
          )${ProjectRepositoryImpl.ORDER}`,
        [areaSlug],
      );
      return ok(await this.attachAreas(rows));
    } catch (error) {
      logger.error('listForArea failed', { areaSlug, error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const ProjectRepository: IProjectRepository = new ProjectRepositoryImpl();
