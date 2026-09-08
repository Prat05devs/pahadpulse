import { err, ok, type Result } from 'neverthrow';

import { AreaRepository } from '../repositories/area.repository.js';
import { IndicatorRepository } from '../repositories/indicator.repository.js';
import type { LocalisedText } from '../models/alert.model.js';
import {
  type Normalisation,
  type ScoreInput,
  type ThemeScore,
  scoreTheme,
} from '../services/comparison.service.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { IndicatorCategory, IndicatorScope } from '../types/indicator.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import { listProjectsForArea, type AreaProjects } from './project.controller.js';

/**
 * How each indicator is made comparable between districts of very different size.
 *
 * Kept in code rather than the catalogue because it is a property of the COMPARISON, not of
 * the indicator: `schools_count` is a perfectly good absolute figure on a district page and
 * only becomes misleading when two districts are ranked against each other by it.
 *
 * Anything absent defaults to 'none'. That default is safe for rates and ratios, which is
 * what every populated indicator currently is.
 */
const NORMALISATION: Readonly<Record<string, Normalisation>> = {
  schools_count: 'per_1000_people',
  health_facilities_count: 'per_1000_people',
  registered_industries_count: 'per_1000_people',
  hospital_beds: 'per_1000_people',
  // Tourism capacity is a count of rooms and beds. Haridwar has more of everything than
  // Rudraprayag largely because it is bigger, and ranking the raw totals would tell an
  // investor that the biggest district is the best opportunity — which is the opposite of
  // what someone looking for an underserved place needs to know.
  tourist_accommodation_units: 'per_1000_people',
  tourist_accommodation_beds: 'per_1000_people',
  govt_accommodation_beds: 'per_1000_people',
  pilgrim_shelter_capacity: 'per_1000_people',
};

/** Indicators that describe a district without ranking it. Shown, never scored. */
const CONTEXT_ONLY = new Set([
  'population',
  /*
   * The SDG rank is the SDG score sorted. Scoring both would count one measurement twice
   * inside the development theme and make it look twice as well-evidenced as it is, while
   * the two are perfectly correlated by construction so the mean would not even move.
   * The score is scored; the rank is shown beside it.
   */
  'sdg_composite_rank',
]);

export interface ComparedDistrict {
  slug: string;
  name: LocalisedText;
  themes: ThemeScore[];
  /**
   * The mean of the themes that could be scored.
   *
   * Null when none could. Deliberately NOT a headline "district score": it is the average
   * of whatever happens to have data, so two districts' overall figures are only comparable
   * when they rest on the same themes — which `comparableThemes` below states outright.
   */
  overall: number | null;
  projects: AreaProjects;
}

export interface DistrictComparison {
  a: ComparedDistrict;
  b: ComparedDistrict;
  /** Themes where BOTH districts have a score, so a verdict is defensible. */
  comparableThemes: IndicatorCategory[];
  /** Plain statements, generated from the numbers above. Never free prose. */
  verdicts: string[];
  /**
   * What the reader must know to read the rest honestly: how thin this comparison is.
   */
  basis: {
    indicatorsScored: number;
    indicatorsAvailable: number;
    contextOnly: string[];
    note: string;
  };
}

const THEMES: IndicatorCategory[] = [
  IndicatorCategory.Demography,
  IndicatorCategory.Economy,
  IndicatorCategory.Education,
  IndicatorCategory.Health,
  IndicatorCategory.Industry,
  IndicatorCategory.Connectivity,
  IndicatorCategory.Development,
  IndicatorCategory.Tourism,
];

const THEME_LABEL: Record<string, string> = {
  demography: 'people and literacy',
  economy: 'incomes',
  education: 'education',
  health: 'health',
  industry: 'industry',
  connectivity: 'connectivity',
  development: 'overall development (SDG index)',
  tourism: 'tourism capacity per resident',
};

/**
 * Verdicts are TEMPLATED over the computed numbers, never written.
 *
 * A sentence generated freely would be unreproducible and could assert something the data
 * does not support — on a government portal, about someone's decision to invest or move.
 * Every sentence here is a direct reading of two scores, and names the gap so a reader can
 * check it against the table.
 */
function buildVerdicts(a: ComparedDistrict, b: ComparedDistrict): string[] {
  const verdicts: string[] = [];

  for (const themeA of a.themes) {
    const themeB = b.themes.find((entry) => entry.theme === themeA.theme);
    if (themeA.score === null || themeB === undefined || themeB.score === null) continue;

    const label = THEME_LABEL[themeA.theme] ?? themeA.theme;
    const gap = Math.abs(themeA.score - themeB.score);
    const basis = Math.min(themeA.basedOn, themeB.basedOn);
    const qualifier = basis === 1 ? ' (on a single indicator)' : ` (on ${basis} indicators)`;

    if (gap < 5) {
      verdicts.push(
        `${a.name.en} and ${b.name.en} are close on ${label}: ${themeA.score} against ${themeB.score}${qualifier}.`,
      );
      continue;
    }

    const [ahead, behind] =
      themeA.score > themeB.score ? [a, b] : [b, a];
    const aheadScore = Math.max(themeA.score, themeB.score);
    const behindScore = Math.min(themeA.score, themeB.score);
    verdicts.push(
      `${ahead.name.en} places higher on ${label} than ${behind.name.en}: ${aheadScore} against ${behindScore} out of 100${qualifier}.`,
    );
  }

  // Development activity is reported as a fact, not folded into the scores. Counting
  // projects as a theme would let one large scheme outweigh a whole statistical category.
  const activeA = a.projects.summary.active;
  const activeB = b.projects.summary.active;
  if (activeA !== activeB) {
    const [more, less] = activeA > activeB ? [a, b] : [b, a];
    verdicts.push(
      `${more.name.en} has ${Math.max(activeA, activeB)} active development project(s) on record against ${Math.min(activeA, activeB)} in ${less.name.en}. The register is not exhaustive.`,
    );
  }

  return verdicts;
}

function overallOf(themes: readonly ThemeScore[]): number | null {
  const scored = themes.filter((theme) => theme.score !== null);
  if (scored.length === 0) return null;
  return Math.round(
    scored.reduce((total, theme) => total + (theme.score ?? 0), 0) / scored.length,
  );
}

/**
 * A full district-to-district comparison.
 *
 * Districts only — IND-4 forbids comparing areas of different types, and the scoring
 * positions a district among the thirteen, which has no meaning for a tehsil.
 */
export async function compareDistricts(
  slugA: string,
  slugB: string,
  now?: Date,
): Promise<Result<DistrictComparison, RequestError>> {
  if (slugA === slugB) return err(ERRORS.COMPARISON_REQUIRES_TWO_AREAS);

  const [areaA, areaB] = await Promise.all([
    AreaRepository.findBySlug(slugA),
    AreaRepository.findBySlug(slugB),
  ]);
  if (areaA.isErr()) return err(areaA.error);
  if (areaB.isErr()) return err(areaB.error);
  if (areaA.value.type !== areaB.value.type) {
    return err(ERRORS.COMPARISON_AREA_TYPE_MISMATCH);
  }

  const [statewide, catalogue] = await Promise.all([
    IndicatorRepository.latestValuesForAllAreas('district'),
    IndicatorRepository.listCatalogue(),
  ]);
  if (statewide.isErr()) return err(statewide.error);
  if (catalogue.isErr()) return err(catalogue.error);

  const populationBySlug: Record<string, number> = {};
  for (const row of statewide.value) {
    if (row.indicator_key === 'population') {
      populationBySlug[row.area_slug] = Number(row.value);
    }
  }

  const sourceIds = [...new Set(statewide.value.map((row) => row.source_id))];
  const sources = await SourceRepository.findByIds(sourceIds, now);
  if (sources.isErr()) return err(sources.error);

  // DS-6 again, at the scoring layer: a value whose source forbids redistribution must not
  // reach a score any more than it may reach a table.
  const inputs: ScoreInput[] = [];
  let available = 0;

  for (const indicator of catalogue.value) {
    if (indicator.scope !== IndicatorScope.District) continue;
    if (CONTEXT_ONLY.has(indicator.key)) continue;

    const rows = statewide.value.filter(
      (row) =>
        row.indicator_key === indicator.key &&
        (sources.value.get(row.source_id)?.mayRedistribute ?? false),
    );
    if (rows.length === 0) continue;
    available += 1;

    const valuesBySlug: Record<string, number> = {};
    for (const row of rows) valuesBySlug[row.area_slug] = Number(row.value);

    inputs.push({
      indicatorKey: indicator.key,
      label: indicator.label.en,
      unit: indicator.unit,
      higherIsBetter: indicator.higherIsBetter,
      normalisation: NORMALISATION[indicator.key] ?? 'none',
      valuesBySlug,
      populationBySlug,
      vintage: rows[0]?.vintage ?? '',
      sourceLabel: sources.value.get(rows[0]?.source_id ?? 0)?.department.en ?? null,
    });
  }

  const build = async (
    slug: string,
    name: LocalisedText,
  ): Promise<ComparedDistrict> => {
    const themes = THEMES.map((theme) =>
      scoreTheme(
        theme,
        inputs.filter((input) => {
          const indicator = catalogue.value.find((entry) => entry.key === input.indicatorKey);
          return indicator !== undefined && indicator.category === theme;
        }),
        slug,
      ),
    );
    const projects = await listProjectsForArea(slug, now);
    return {
      slug,
      name,
      themes,
      overall: overallOf(themes),
      projects: projects.isOk()
        ? projects.value
        : { projects: [], summary: { total: 0, active: 0, operational: 0, underConstruction: 0, disclosedCapitalCr: null, withDisclosedCost: 0, bySector: {} } },
    };
  };

  const [builtA, builtB] = await Promise.all([
    build(areaA.value.slug, areaA.value.name),
    build(areaB.value.slug, areaB.value.name),
  ]);

  const comparableThemes = builtA.themes
    .filter((theme) => {
      const other = builtB.themes.find((entry) => entry.theme === theme.theme);
      return theme.score !== null && other !== undefined && other.score !== null;
    })
    .map((theme) => theme.theme);

  const scored = new Set(
    builtA.themes.flatMap((theme) => theme.indicators.map((entry) => entry.indicatorKey)),
  );

  return ok({
    a: builtA,
    b: builtB,
    comparableThemes,
    verdicts: buildVerdicts(builtA, builtB),
    basis: {
      indicatorsScored: scored.size,
      indicatorsAvailable: available,
      contextOnly: [...CONTEXT_ONLY],
      note:
        'Scores are positions among Uttarakhand’s 13 districts, not marks out of 100. ' +
        'An indicator with no better direction — population, sex ratio — is shown but never ranked. ' +
        'Development projects are reported alongside the scores rather than folded into them.',
    },
  });
}
