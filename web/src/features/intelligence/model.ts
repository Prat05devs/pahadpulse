import { z } from 'zod';

import type { DistrictStanding, RankedIndicator } from '@/features/governance/schemas';
import type { Indicator } from '@/features/indicators/schemas';

export type CoverageStatus =
  'comparable' | 'context' | 'partial' | 'state' | 'catalogue' | 'unavailable';

export interface IndicatorCoverageRow {
  key: string;
  label: string;
  labelHi: string;
  category: string;
  scope: Indicator['scope'];
  unit: string;
  status: CoverageStatus;
  vintage: string | null;
}

export interface SectorCoverage {
  category: string;
  total: number;
  districtTotal: number;
  districtComplete: number;
  partial: number;
  stateLevel: number;
  catalogueOnly: number;
  unavailable: number;
  coveragePercent: number;
}

export interface BenchmarkDistrict {
  name: string;
  slug: string;
  item: RankedIndicator;
}

export interface BenchmarkRow {
  key: string;
  label: string;
  vintage: string;
  leaders: BenchmarkDistrict[];
  trailers: BenchmarkDistrict[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  demography: 'Demography',
  education: 'Education',
  health: 'Health',
  economy: 'Economy',
  industry: 'Industry',
  connectivity: 'Connectivity',
  development: 'Development',
  tourism: 'Tourism',
  geography: 'Geography',
  environment: 'Environment',
};

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  comparable: 'Comparable across 13 districts',
  context: 'Published context, not rankable',
  partial: 'Partial district coverage',
  state: 'State-level metric',
  catalogue: 'Catalogued, no district figure',
  unavailable: 'Coverage service unavailable',
};

const FilterValueSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().max(80).optional()
);

const IntelligenceFiltersSchema = z.object({
  q: FilterValueSchema.catch(undefined),
  sector: FilterValueSchema.catch(undefined),
  status: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z
      .enum(['comparable', 'context', 'partial', 'state', 'catalogue', 'unavailable'])
      .optional()
      .catch(undefined)
  ),
});

export type IntelligenceFilters = z.infer<typeof IntelligenceFiltersSchema>;

/** Query-string filters are public input, so invalid or overlong values are discarded. */
export function parseIntelligenceFilters(value: unknown): IntelligenceFilters {
  const parsed = IntelligenceFiltersSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

const CATEGORY_ORDER = [
  'demography',
  'development',
  'economy',
  'health',
  'education',
  'tourism',
  'industry',
  'connectivity',
  'environment',
  'geography',
];

export function buildCoverageRows(
  catalogue: readonly Indicator[],
  standing: DistrictStanding | null
): IndicatorCoverageRow[] {
  const used = new Map(standing?.used.map((item) => [item.key, item]) ?? []);
  const excluded = new Map(standing?.excluded.map((item) => [item.key, item]) ?? []);

  return catalogue
    .map((indicator): IndicatorCoverageRow => {
      const comparable = used.get(indicator.key);
      const omitted = excluded.get(indicator.key);

      let status: CoverageStatus;
      if (indicator.scope === 'state') status = 'state';
      else if (standing === null) status = 'unavailable';
      else if (comparable !== undefined) status = 'comparable';
      else if (omitted?.reason === 'no-direction') status = 'context';
      else if (omitted?.reason === 'partial-coverage') status = 'partial';
      else status = 'catalogue';

      return {
        key: indicator.key,
        label: indicator.label.en,
        labelHi: indicator.label.hi,
        category: indicator.category,
        scope: indicator.scope,
        unit: indicator.unit,
        status,
        vintage: comparable?.vintage ?? omitted?.vintage ?? null,
      };
    })
    .sort((a, b) => {
      const categoryA = CATEGORY_ORDER.indexOf(a.category);
      const categoryB = CATEGORY_ORDER.indexOf(b.category);
      const normalizedA = categoryA === -1 ? CATEGORY_ORDER.length : categoryA;
      const normalizedB = categoryB === -1 ? CATEGORY_ORDER.length : categoryB;
      return normalizedA - normalizedB || a.label.localeCompare(b.label);
    });
}

export function buildSectorCoverage(rows: readonly IndicatorCoverageRow[]): SectorCoverage[] {
  const grouped = new Map<string, IndicatorCoverageRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.category) ?? [];
    current.push(row);
    grouped.set(row.category, current);
  }

  return [...grouped.entries()]
    .map(([category, entries]) => {
      const districtEntries = entries.filter((entry) => entry.scope === 'district');
      const districtComplete = districtEntries.filter(
        (entry) => entry.status === 'comparable' || entry.status === 'context'
      ).length;
      return {
        category,
        total: entries.length,
        districtTotal: districtEntries.length,
        districtComplete,
        partial: entries.filter((entry) => entry.status === 'partial').length,
        stateLevel: entries.filter((entry) => entry.status === 'state').length,
        catalogueOnly: entries.filter((entry) => entry.status === 'catalogue').length,
        unavailable: entries.filter((entry) => entry.status === 'unavailable').length,
        coveragePercent:
          districtEntries.length === 0
            ? 0
            : Math.round((districtComplete / districtEntries.length) * 100),
      };
    })
    .sort((a, b) => {
      const orderA = CATEGORY_ORDER.indexOf(a.category);
      const orderB = CATEGORY_ORDER.indexOf(b.category);
      const normalizedA = orderA === -1 ? CATEGORY_ORDER.length : orderA;
      const normalizedB = orderB === -1 ? CATEGORY_ORDER.length : orderB;
      return normalizedA - normalizedB;
    });
}

export function buildBenchmarkRows(standing: DistrictStanding | null): BenchmarkRow[] {
  if (standing === null) return [];

  return standing.used.map((indicator) => {
    const entries = standing.districts.flatMap((district) => {
      const item = district.ranked.find((candidate) => candidate.key === indicator.key);
      return item === undefined ? [] : [{ name: district.name, slug: district.slug, item }];
    });
    const finalRank = entries.reduce((maximum, entry) => Math.max(maximum, entry.item.rank), 0);

    return {
      key: indicator.key,
      label: indicator.label,
      vintage: indicator.vintage,
      leaders: entries.filter((entry) => entry.item.rank === 1),
      trailers: entries.filter((entry) => entry.item.rank === finalRank),
    };
  });
}
