import { err, ok } from 'neverthrow';

import * as areaController from '../../../controllers/area.controller.js';
import * as destinationController from '../../../controllers/destination.controller.js';
import * as governanceController from '../../../controllers/governance.controller.js';
import * as indicatorController from '../../../controllers/indicator.controller.js';
import * as sourceController from '../../../controllers/source.controller.js';
import type { AreaIndicatorValueOut } from '../../../models/indicator.model.js';
import { Freshness } from '../../../types/dataset.js';
import { STATE_SLUG } from '../districts.js';
import {
  asUnavailable,
  empty,
  formatCount,
  formatDay,
  same,
  sourceOf,
  unavailable,
} from '../format.js';
import type { Fact, Localised, Resolver } from '../types.js';

// ── Tourism ──────────────────────────────────────────────────────────────────────────────

/**
 * The latest COMPLETED year, as the web home page does: the current season is still being
 * counted, and a partial total read as a year's total would understate it.
 */
async function pilgrimYears(now: Date) {
  const arrivals = await destinationController.listPilgrimArrivals(now);
  if (arrivals.isErr()) return arrivals;
  const completed = arrivals.value.totals
    .filter((entry) => entry.year < now.getUTCFullYear())
    .sort((a, b) => b.year - a.year);
  return ok({ arrivals: arrivals.value, latest: completed[0], previous: completed[1] });
}

function pilgrimSource(
  arrivals: Awaited<ReturnType<typeof destinationController.listPilgrimArrivals>>,
  year: number,
): Fact['source'] {
  if (arrivals.isErr()) return null;
  for (const destination of arrivals.value.destinations) {
    const entry = destination.years.find((y) => y.year === year);
    if (entry?.provenance) return sourceOf(entry.provenance);
  }
  return null;
}

export const tourismCharDham: Resolver = async (_params, now) => {
  const years = await pilgrimYears(now);
  if (years.isErr()) return asUnavailable(years.error) ?? err(years.error);
  const { latest } = years.value;
  if (latest === undefined) return ok(unavailable('no_data'));

  return ok({
    status: 'ok',
    slots: { visitors: formatCount(latest.visitors), year: latest.year },
    facts: [
      {
        label: { en: `Pilgrim visits, ${latest.year}`, hi: `तीर्थयात्री, ${latest.year}` },
        value: formatCount(latest.visitors),
        vintage: `${latest.year}-12-31`,
        source: pilgrimSource(ok(years.value.arrivals), latest.year),
      },
    ],
  });
};

export const tourismBusiest: Resolver = async (_params, now) => {
  const years = await pilgrimYears(now);
  if (years.isErr()) return asUnavailable(years.error) ?? err(years.error);
  const { latest, arrivals } = years.value;
  if (latest === undefined) return ok(unavailable('no_data'));

  const ranked = arrivals.destinations
    .flatMap((destination) => {
      const entry = destination.years.find((y) => y.year === latest.year);
      return entry === undefined ? [] : [{ destination, entry }];
    })
    .sort((a, b) => b.entry.visitors - a.entry.visitors);
  const top = ranked[0];
  if (top === undefined) return ok(unavailable('no_data'));

  return ok({
    status: 'ok',
    slots: {
      shrine: top.destination.name,
      visitors: formatCount(top.entry.visitors),
      year: latest.year,
    },
    facts: ranked.slice(0, 3).map(({ destination, entry }) => ({
      label: destination.name,
      value: formatCount(entry.visitors),
      vintage: entry.vintage,
      source: sourceOf(entry.provenance),
    })),
  });
};

export const tourismTrend: Resolver = async (_params, now) => {
  const years = await pilgrimYears(now);
  if (years.isErr()) return asUnavailable(years.error) ?? err(years.error);
  const { latest, previous } = years.value;
  if (latest === undefined || previous === undefined || previous.visitors === 0) {
    return ok(unavailable('no_data'));
  }
  const change = ((latest.visitors - previous.visitors) / previous.visitors) * 100;
  const direction: Localised = change >= 0 ? { en: 'up', hi: 'अधिक' } : { en: 'down', hi: 'कम' };
  const source = pilgrimSource(ok(years.value.arrivals), latest.year);

  return ok({
    status: 'ok',
    slots: {
      year: latest.year,
      previousYear: previous.year,
      visitors: formatCount(latest.visitors),
      previousVisitors: formatCount(previous.visitors),
      change: formatCount(Math.abs(change), 1),
      direction,
    },
    facts: [latest, previous].map((entry) => ({
      label: { en: `Pilgrim visits, ${entry.year}`, hi: `तीर्थयात्री, ${entry.year}` },
      value: formatCount(entry.visitors),
      vintage: `${entry.year}-12-31`,
      source,
    })),
  });
};

// ── Indicators (districts and the state) ─────────────────────────────────────────────────

function figure(entry: AreaIndicatorValueOut, suffix = ''): string {
  return `${formatCount(entry.value, entry.indicator.decimals)}${suffix}`;
}

function suffixFor(unit: string): string {
  if (unit === 'percent' || unit === 'pct') return '%';
  if (unit === 'sq_km') return ' km²';
  return '';
}

/** One indicator for one area, with the date it describes and who published it. */
export function indicatorResolver(key: string, area: 'district' | 'state'): Resolver {
  return async ({ district }, now) => {
    const slug = area === 'state' ? STATE_SLUG : district?.slug;
    if (slug === undefined) return ok(empty());
    const indicators = await indicatorController.getAreaIndicators(slug, now);
    if (indicators.isErr()) return asUnavailable(indicators.error) ?? err(indicators.error);

    const entry = indicators.value.values.find((value) => value.indicator.key === key);
    if (entry === undefined)
      return ok(unavailable('no_data', { district: district?.name ?? same('') }));

    const value = figure(entry, suffixFor(entry.indicator.unit));
    return ok({
      status: 'ok',
      slots: {
        district: district?.name ?? same(''),
        value,
        year: entry.vintage.slice(0, 4),
        department: entry.provenance?.department ?? same('the publishing department'),
      },
      facts: [
        {
          label: entry.indicator.label,
          value,
          vintage: entry.vintage,
          source: sourceOf(entry.provenance),
        },
      ],
    });
  };
}

function populationRanking(pick: 'largest' | 'smallest'): Resolver {
  return async (_params, now) => {
    const ranking = await indicatorController.getRanking('population', undefined, 0, 50, now);
    if (ranking.isErr()) return asUnavailable(ranking.error) ?? err(ranking.error);
    const sorted = [...ranking.value.data].sort((a, b) =>
      pick === 'largest' ? b.value - a.value : a.value - b.value,
    );
    const top = sorted[0];
    if (top === undefined) return ok(unavailable('no_data'));

    return ok({
      status: 'ok',
      slots: {
        district: top.area.name,
        value: formatCount(top.value),
        year: top.vintage.slice(0, 4),
      },
      facts: sorted.slice(0, 3).map((entry) => ({
        label: entry.area.name,
        value: formatCount(entry.value),
        vintage: entry.vintage,
        source: sourceOf(entry.provenance),
      })),
    });
  };
}

export const districtLargest = populationRanking('largest');
export const districtSmallest = populationRanking('smallest');

const DIVISION: Record<string, Localised> = {
  garhwal: { en: 'Garhwal', hi: 'गढ़वाल' },
  kumaon: { en: 'Kumaon', hi: 'कुमाऊँ' },
};

const GEOGRAPHY_SOURCE: Fact['source'] = null;

export const districtOverview: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const [detail, indicators] = await Promise.all([
    areaController.getDistrictDetail(district.slug),
    indicatorController.getAreaIndicators(district.slug, now),
  ]);
  if (detail.isErr()) return asUnavailable(detail.error) ?? err(detail.error);

  const { district: area, tehsils } = detail.value;
  const population = indicators.isOk()
    ? indicators.value.values.find((value) => value.indicator.key === 'population')
    : undefined;
  const division = area.division === null ? null : DIVISION[area.division];
  const facts: Fact[] = [];
  if (population !== undefined) {
    facts.push({
      label: population.indicator.label,
      value: figure(population),
      vintage: population.vintage,
      source: sourceOf(population.provenance),
    });
  }

  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      division: division ?? { en: 'Uttarakhand', hi: 'उत्तराखंड' },
      headquarters: area.headquarters ?? { en: 'not recorded', hi: 'दर्ज नहीं' },
      tehsils: formatCount(tehsils.length),
      population: population === undefined ? '—' : figure(population),
      year: population?.vintage.slice(0, 4) ?? '—',
    },
    facts,
  });
};

export const districtHeadquarters: Resolver = async ({ district }) => {
  if (district === undefined) return ok(empty());
  const detail = await areaController.getDistrictDetail(district.slug);
  if (detail.isErr()) return asUnavailable(detail.error) ?? err(detail.error);
  const hq = detail.value.district.headquarters;
  if (hq === null) return ok(unavailable('no_data', { district: district.name }));
  return ok({
    status: 'ok',
    slots: { district: district.name, headquarters: hq },
    facts: [
      {
        label: { en: 'Headquarters', hi: 'मुख्यालय' },
        value: hq.en,
        vintage: null,
        source: GEOGRAPHY_SOURCE,
      },
    ],
  });
};

export const districtDivision: Resolver = async ({ district }) => {
  if (district === undefined) return ok(empty());
  const detail = await areaController.getDistrictDetail(district.slug);
  if (detail.isErr()) return asUnavailable(detail.error) ?? err(detail.error);
  const code = detail.value.district.division;
  const division = code === null ? undefined : DIVISION[code];
  if (division === undefined) return ok(unavailable('no_data', { district: district.name }));
  return ok({
    status: 'ok',
    slots: { district: district.name, division },
    facts: [
      {
        label: { en: 'Division', hi: 'मंडल' },
        value: division.en,
        vintage: null,
        source: GEOGRAPHY_SOURCE,
      },
    ],
  });
};

export const districtList: Resolver = async () => {
  const districts = await areaController.listDistricts();
  if (districts.isErr()) return err(districts.error);
  const names = districts.value.map((d) => d.name);
  return ok({
    status: 'ok',
    slots: {
      count: formatCount(names.length),
      names: { en: names.map((n) => n.en).join(', '), hi: names.map((n) => n.hi).join(', ') },
    },
    facts: [],
  });
};

// ── Budget ───────────────────────────────────────────────────────────────────────────────

/** Stored in thousands of rupees (budget.model.ts); 1 crore = 10,000 thousand. */
function crore(thousands: number): string {
  return formatCount(thousands / 10_000, 0);
}

async function latestBudget(now: Date) {
  const years = await governanceController.listBudgetYears();
  if (years.isErr()) return years;
  const year = years.value[0];
  if (year === undefined) return ok(null);
  const budget = await governanceController.getBudget(year, now);
  return budget.isErr() ? budget : ok(budget.value);
}

export const budgetTotal: Resolver = async (_params, now) => {
  const budget = await latestBudget(now);
  if (budget.isErr()) return asUnavailable(budget.error) ?? err(budget.error);
  if (budget.value === null || budget.value.total === 0) return ok(unavailable('no_data'));

  const { fiscalYear, total, summary } = budget.value;
  return ok({
    status: 'ok',
    slots: { year: fiscalYear, total: crore(total) },
    facts: [
      {
        label: { en: `Total expenditure, ${fiscalYear}`, hi: `कुल व्यय, ${fiscalYear}` },
        value: `₹${crore(total)} crore`,
        vintage: fiscalYear,
        source: summary === null ? null : sourceOf(summary.provenance),
      },
    ],
  });
};

export const budgetTop: Resolver = async (_params, now) => {
  const budget = await latestBudget(now);
  if (budget.isErr()) return asUnavailable(budget.error) ?? err(budget.error);
  if (budget.value === null || budget.value.departments.length === 0)
    return ok(unavailable('no_data'));

  const top = [...budget.value.departments].sort((a, b) => b.total - a.total).slice(0, 3);
  return ok({
    status: 'ok',
    slots: {
      year: budget.value.fiscalYear,
      departments: top.map((d) => `${d.name} (${formatCount(d.share, 1)}%)`).join('; '),
    },
    facts: top.map((d) => ({
      label: same(d.name),
      value: `₹${crore(d.total)} crore · ${formatCount(d.share, 1)}%`,
      vintage: d.fiscalYear,
      source: sourceOf(d.provenance),
    })),
  });
};

// ── About the data ───────────────────────────────────────────────────────────────────────

async function publicSources(now: Date) {
  const sources = await sourceController.listSources(now);
  if (sources.isErr()) return sources;
  // DS-6: a source we may not republish is not advertised as one we show.
  return ok(sources.value.filter((source) => source.mayRedistribute));
}

export const dataSources: Resolver = async (_params, now) => {
  const sources = await publicSources(now);
  if (sources.isErr()) return err(sources.error);
  const departments = [
    ...new Map(sources.value.map((s) => [s.department.en, s.department])).values(),
  ];
  return ok({
    status: 'ok',
    slots: {
      count: formatCount(sources.value.length),
      examples: {
        en: departments
          .slice(0, 5)
          .map((d) => d.en)
          .join('; '),
        hi: departments
          .slice(0, 5)
          .map((d) => d.hi)
          .join('; '),
      },
    },
    facts: departments.slice(0, 5).map((department) => ({
      label: { en: 'Source', hi: 'स्रोत' },
      value: department.en,
      vintage: null,
      source: {
        department,
        url: sources.value.find((s) => s.department.en === department.en)?.url ?? null,
      },
    })),
  });
};

export const dataFreshness: Resolver = async (_params, now) => {
  const sources = await publicSources(now);
  if (sources.isErr()) return err(sources.error);
  const count = (freshness: Freshness) =>
    formatCount(sources.value.filter((s) => s.freshness === freshness).length);
  return ok({
    status: 'ok',
    slots: {
      total: formatCount(sources.value.length),
      fresh: count(Freshness.Fresh),
      stale: count(Freshness.Stale),
      expired: count(Freshness.Expired),
    },
    facts: [],
  });
};

export const dataDistrict: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const indicators = await indicatorController.getAreaIndicators(district.slug, now);
  if (indicators.isErr()) return asUnavailable(indicators.error) ?? err(indicators.error);
  const values = indicators.value.values;
  if (values.length === 0) return ok(empty({ district: district.name }));
  const categories = new Set(values.map((v) => v.indicator.category));
  const latest =
    values
      .map((v) => v.vintage)
      .sort()
      .at(-1) ?? '';
  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      count: formatCount(values.length),
      categories: formatCount(categories.size),
      latest: formatDay(latest),
    },
    facts: [],
  });
};
