import type { LocalisedText } from './alert.model.js';
import type { Provenance } from './source.model.js';

export const PROJECTS_TABLE = 'development_projects';
export const PROJECT_AREAS_TABLE = 'development_project_areas';

export type ProjectStatus =
  | 'announced'
  | 'approved'
  | 'under_construction'
  | 'operational'
  | 'stalled'
  | 'cancelled';

export type ProjectSector =
  | 'connectivity'
  | 'education'
  | 'health'
  | 'tourism'
  | 'industry'
  | 'energy'
  | 'governance'
  | 'culture'
  | 'environment';

/**
 * How well-attested a project is. Carried through to the API and shown, never collapsed
 * into the other fields — see the column comment in migration 036 for why.
 */
export type ProjectConfidence = 'official' | 'reported' | 'indicative';

export interface ProjectRow {
  id: number;
  slug: string;
  name_en: string;
  name_hi: string | null;
  sector: ProjectSector;
  status: ProjectStatus;
  confidence: ProjectConfidence;
  summary_en: string;
  summary_hi: string | null;
  /** NUMERIC arrives as a string; never narrowed by the driver. */
  capital_cost_cr: string | null;
  announced_on: string | null;
  expected_on: string | null;
  completed_on: string | null;
  source_id: number;
  evidence_url: string;
  verified_on: string;
  /** `updated_at`, aliased. This register has no fetch: a human edit IS its retrieval. */
  fetched_at: string;
}

export interface Project {
  id: number;
  slug: string;
  name: LocalisedText;
  sector: ProjectSector;
  status: ProjectStatus;
  confidence: ProjectConfidence;
  summary: LocalisedText;
  /** Rupees in crore, as Indian government reporting states it. Null when unpublished. */
  capitalCostCr: number | null;
  announcedOn: string | null;
  expectedOn: string | null;
  completedOn: string | null;
  /**
   * The page supporting THIS project, not the publisher's home page. A reader has to be
   * able to check the claim, not merely learn who made it — so the API never omits it.
   */
  evidenceUrl: string;
  /** When a human last confirmed `evidenceUrl` still says what this row claims. */
  verifiedOn: string;
  /*
   * Provenance plumbing, matching every other public read. `vintage` is `verifiedOn` — for
   * a curated row the date the claim was last checked against its evidence IS the date the
   * figure describes (DS-2) — and `fetchedAt` is when the row itself last changed.
   */
  sourceId: number;
  vintage: string;
  fetchedAt: string;
  /** Districts this project sits in or serves. `isPrimary` distinguishes the two. */
  areas: Array<{ slug: string; name: LocalisedText; isPrimary: boolean }>;
}

export type ProjectOut = Project & { provenance: Provenance | null };

/**
 * `name_hi` and `summary_hi` fall back to English rather than to null.
 *
 * Every other localised field in this system carries both languages because the content is
 * seeded with both. These are curated by hand and Hindi may lag, and a Hindi reader is
 * better served by the English sentence than by an empty panel.
 */
export function toProject(
  row: ProjectRow,
  areas: Array<{ slug: string; name: LocalisedText; isPrimary: boolean }>,
): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.name_en, hi: row.name_hi ?? row.name_en },
    sector: row.sector,
    status: row.status,
    confidence: row.confidence,
    summary: { en: row.summary_en, hi: row.summary_hi ?? row.summary_en },
    capitalCostCr: row.capital_cost_cr === null ? null : Number(row.capital_cost_cr),
    announcedOn: row.announced_on,
    expectedOn: row.expected_on,
    completedOn: row.completed_on,
    evidenceUrl: row.evidence_url,
    verifiedOn: row.verified_on,
    sourceId: row.source_id,
    vintage: row.verified_on,
    fetchedAt: row.fetched_at,
    areas,
  };
}

/**
 * Whether a project counts as momentum for a district right now.
 *
 * Used by the comparison layer. `cancelled` and `stalled` are excluded because they are the
 * opposite of momentum, and a register that counted them would rank a district higher for
 * having had a project fall over.
 */
export function isActiveProject(status: ProjectStatus): boolean {
  return status !== 'cancelled' && status !== 'stalled';
}
