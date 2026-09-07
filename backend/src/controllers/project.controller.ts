import { err, ok, type Result } from 'neverthrow';

import type { ProjectOut, ProjectSector } from '../models/project.model.js';
import { isActiveProject } from '../models/project.model.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { RequestError } from '../utils/errors.js';

/** What a district's development activity looks like, for the comparison layer and the UI. */
export interface AreaProjects {
  projects: ProjectOut[];
  /**
   * Counts, so the comparison layer never has to re-derive them and disagree with the list
   * shown beside it — the same guarantee the alerts summary now owes the alerts list.
   */
  summary: {
    total: number;
    /** Excludes cancelled and stalled: those are the opposite of momentum. */
    active: number;
    operational: number;
    underConstruction: number;
    /** Rupees in crore across projects that publish a figure. Null when none do. */
    disclosedCapitalCr: number | null;
    /** How many projects publish a cost at all, so the total above can be read honestly. */
    withDisclosedCost: number;
    bySector: Partial<Record<ProjectSector, number>>;
  };
}

function summarise(projects: ProjectOut[]): AreaProjects['summary'] {
  const bySector: Partial<Record<ProjectSector, number>> = {};
  let disclosed = 0;
  let withCost = 0;

  for (const project of projects) {
    bySector[project.sector] = (bySector[project.sector] ?? 0) + 1;
    if (project.capitalCostCr !== null) {
      disclosed += project.capitalCostCr;
      withCost += 1;
    }
  }

  return {
    total: projects.length,
    active: projects.filter((project) => isActiveProject(project.status)).length,
    operational: projects.filter((project) => project.status === 'operational').length,
    underConstruction: projects.filter((project) => project.status === 'under_construction')
      .length,
    // Null rather than 0 when nothing published a figure: a zero here would read as "no
    // investment", when it means "no cost was published".
    disclosedCapitalCr: withCost === 0 ? null : Number(disclosed.toFixed(2)),
    withDisclosedCost: withCost,
    bySector,
  };
}

/**
 * Every project in the register.
 *
 * Runs through the same DS-6 redistribution filter as every other public read, so a source
 * whose terms change stops being served without a code change.
 */
export async function listProjects(now?: Date): Promise<Result<AreaProjects, RequestError>> {
  const projects = await ProjectRepository.listAll();
  if (projects.isErr()) return err(projects.error);

  // `verifiedOn` is this register's vintage: it is the date the claim was last checked
  // against its evidence, which is what freshness means for a hand-curated row (DS-2).
  const stamped = await attachProvenance(projects.value, now);
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value);
  return ok({ projects: visible, summary: summarise(visible) });
}

/** The projects sitting in or serving one district. */
export async function listProjectsForArea(
  areaSlug: string,
  now?: Date,
): Promise<Result<AreaProjects, RequestError>> {
  const projects = await ProjectRepository.listForArea(areaSlug);
  if (projects.isErr()) return err(projects.error);

  const stamped = await attachProvenance(projects.value, now);
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value);
  return ok({ projects: visible, summary: summarise(visible) });
}
