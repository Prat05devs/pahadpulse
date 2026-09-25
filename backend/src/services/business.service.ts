import { db } from '../database/db.js';
import {
  BUSINESS_SCENARIOS,
  type BusinessScenario,
  type BusinessWeights,
} from '../models/business-scenarios.js';
import type { BusinessScheme } from '../models/business-scheme.model.js';
import { recommendBusinessSchemes } from './business-scheme.service.js';

type MetricKey = keyof BusinessWeights;
type Confidence = 'low' | 'medium' | 'high';

interface EvidenceFact {
  label: string;
  value: number;
  unit: string;
  vintage: string;
  source: string;
  sourceUrl: string | null;
}

interface MetricDetail {
  available: boolean;
  score: number | null;
  summary: string;
  facts: EvidenceFact[];
}

interface NetworkReading {
  downloadKbps: number;
  uploadKbps: number;
  latencyMs: number;
  tests: number;
  vintage: string;
  source: string;
  sourceUrl: string | null;
}

interface IndicatorReading {
  value: number;
  unit: string;
  vintage: string;
  source: string;
  sourceUrl: string | null;
}

interface RawDistrictMetrics {
  areaId: number;
  slug: string;
  nameEn: string;
  network: Partial<Record<'fixed' | 'mobile', NetworkReading>>;
  tourismVisitors: IndicatorReading | null;
  indicators: Partial<Record<string, IndicatorReading>>;
}

interface ComparisonDistrict {
  slug: string;
  name: string;
  score: number;
  /** Kept numeric for compatibility with a frontend deployed before the evidence fields. */
  metrics: Record<MetricKey, number>;
  metricDetails: Record<MetricKey, MetricDetail>;
}

export interface ComparisonReport {
  winner: string;
  districtA: ComparisonDistrict;
  districtB: ComparisonDistrict;
  scenario: BusinessScenario;
  verdict: string;
  evidence: {
    confidence: Confidence;
    coveragePct: number;
    availableWeight: number;
    requestedWeight: number;
    availableMetrics: MetricKey[];
    missingMetrics: MetricKey[];
    note: string;
  };
  recommendedSchemes: BusinessScheme[];
}

interface AreaRow {
  id: number;
  slug: string;
  name_en: string;
}

interface NetworkRow {
  area_id: number;
  kind: 'fixed' | 'mobile';
  download_kbps: number;
  upload_kbps: number;
  latency_ms: number;
  tests: number;
  vintage: string;
  source: string;
  source_url: string | null;
}

interface TourismRow {
  area_id: number;
  visitors: string;
  vintage: string;
  source: string;
  source_url: string | null;
}

interface IndicatorRow {
  area_id: number;
  indicator_key: string;
  value: string;
  unit: string;
  vintage: string;
  source: string;
  source_url: string | null;
}

const METRIC_LABELS: Record<MetricKey, string> = {
  connectivity: 'digital readiness',
  tourism: 'tourism demand and visitor infrastructure',
  roads: 'district road access',
  urbanPopulation: 'market and workforce',
  agriculture: 'dairy supply and cooperative ecosystem',
  safety: 'long-term hazard resilience',
};

const INDICATOR_KEYS = [
  'population',
  'literacy_rate',
  'per_capita_income',
  'sdg_composite_score',
  'milk_production_daily_kg',
  'dairy_societies',
  'women_dairy_societies',
  'tourist_accommodation_units',
  'tourist_accommodation_beds',
  'pilgrim_shelter_capacity',
  'govt_accommodation_beds',
] as const;

/** Missing values remain missing; they never become a false zero or neutral 50. */
export function normalizeAvailable(
  values: readonly (number | null)[],
  options: { higherIsBetter?: boolean; logarithmic?: boolean } = {},
): Array<number | null> {
  const higherIsBetter = options.higherIsBetter ?? true;
  const transform = (value: number) => (options.logarithmic ? Math.log1p(value) : value);
  const present = values.filter((value): value is number => value !== null).map(transform);
  if (present.length === 0) return values.map(() => null);

  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min;

  return values.map((value) => {
    if (value === null) return null;
    if (range === 0) return 50;
    const position = ((transform(value) - min) / range) * 100;
    return higherIsBetter ? position : 100 - position;
  });
}

function combine(parts: ReadonlyArray<readonly [number | null, number]>): number | null {
  let weighted = 0;
  let weight = 0;
  for (const [score, partWeight] of parts) {
    if (score === null) continue;
    weighted += score * partWeight;
    weight += partWeight;
  }
  return weight === 0 ? null : weighted / weight;
}

export function weightedScore(
  metrics: Readonly<Record<MetricKey, number | null>>,
  weights: Readonly<BusinessWeights>,
  availableKeys: ReadonlySet<MetricKey>,
): number | null {
  let total = 0;
  let weight = 0;
  for (const key of Object.keys(weights) as MetricKey[]) {
    const score = metrics[key];
    if (!availableKeys.has(key) || score === null || weights[key] <= 0) continue;
    total += score * weights[key];
    weight += weights[key];
  }
  return weight === 0 ? null : total / weight;
}

function fact(label: string, reading: IndicatorReading, unit: string = reading.unit): EvidenceFact {
  return {
    label,
    value: reading.value,
    unit,
    vintage: reading.vintage,
    source: reading.source,
    sourceUrl: reading.sourceUrl,
  };
}

function unavailable(summary: string): MetricDetail {
  return { available: false, score: null, summary, facts: [] };
}

export class BusinessService {
  async getScenarios() {
    return BUSINESS_SCENARIOS;
  }

  async getScenarioById(id: string) {
    return BUSINESS_SCENARIOS.find((scenario) => scenario.id === id);
  }

  /** Fetches only district evidence with complete, attributable coverage. */
  async fetchRawMetrics(): Promise<RawDistrictMetrics[]> {
    const [{ rows: areas }, { rows: networkRows }, { rows: tourismRows }, { rows: indicatorRows }] =
      await Promise.all([
        db.query<AreaRow>(`
          SELECT id, slug, name_en
          FROM areas
          WHERE type = 'district'
          ORDER BY id
        `),
        db.query<NetworkRow>(`
          SELECT DISTINCT ON (n.area_id, n.kind)
            n.area_id,
            n.kind,
            n.download_kbps,
            n.upload_kbps,
            n.latency_ms,
            n.tests,
            n.quarter_start::text AS vintage,
            s.department_en AS source,
            s.url AS source_url
          FROM network_performance n
          JOIN sources s ON s.id = n.source_id
          ORDER BY n.area_id, n.kind, n.quarter_start DESC
        `),
        db.query<TourismRow>(`
          SELECT
            d.area_id,
            SUM(v.visitors)::text AS visitors,
            MAX(v.year)::text AS vintage,
            MAX(s.department_en) AS source,
            MAX(s.url) AS source_url
          FROM destination_annual_visitors v
          JOIN destinations d ON d.id = v.destination_id
          JOIN sources s ON s.id = v.source_id
          WHERE v.year = 2025
          GROUP BY d.area_id
        `),
        db.query<IndicatorRow>(
          `
            SELECT DISTINCT ON (v.indicator_key, v.area_id)
              v.area_id,
              v.indicator_key,
              v.value::text,
              i.unit,
              v.vintage::text,
              s.department_en AS source,
              s.url AS source_url
            FROM indicator_values v
            JOIN indicators i ON i.indicator_key = v.indicator_key
            JOIN sources s ON s.id = v.source_id
            WHERE v.indicator_key = ANY($1::varchar[])
            ORDER BY v.indicator_key, v.area_id, v.vintage DESC
          `,
          [[...INDICATOR_KEYS]],
        ),
      ]);

    const districts = new Map<number, RawDistrictMetrics>();
    for (const area of areas) {
      districts.set(area.id, {
        areaId: area.id,
        slug: area.slug,
        nameEn: area.name_en,
        network: {},
        tourismVisitors: null,
        indicators: {},
      });
    }

    for (const row of networkRows) {
      const district = districts.get(row.area_id);
      if (district === undefined) continue;
      district.network[row.kind] = {
        downloadKbps: row.download_kbps,
        uploadKbps: row.upload_kbps,
        latencyMs: row.latency_ms,
        tests: row.tests,
        vintage: row.vintage,
        source: row.source,
        sourceUrl: row.source_url,
      };
    }

    for (const row of tourismRows) {
      const district = districts.get(row.area_id);
      if (district === undefined) continue;
      district.tourismVisitors = {
        value: Number(row.visitors),
        unit: 'visitors',
        vintage: row.vintage,
        source: row.source,
        sourceUrl: row.source_url,
      };
    }

    for (const row of indicatorRows) {
      const district = districts.get(row.area_id);
      if (district === undefined) continue;
      district.indicators[row.indicator_key] = {
        value: Number(row.value),
        unit: row.unit,
        vintage: row.vintage,
        source: row.source,
        sourceUrl: row.source_url,
      };
    }

    return [...districts.values()];
  }

  async compareDistricts(
    slugA: string,
    slugB: string,
    scenarioId: string,
  ): Promise<ComparisonReport> {
    const scenario = await this.getScenarioById(scenarioId);
    if (scenario === undefined) throw new Error('Scenario not found');

    const raw = await this.fetchRawMetrics();
    const districtA = raw.find((district) => district.slug === slugA);
    const districtB = raw.find((district) => district.slug === slugB);
    if (districtA === undefined || districtB === undefined) {
      throw new Error('One or both districts not found');
    }

    const series = (
      getter: (district: RawDistrictMetrics) => number | null,
      options?: { higherIsBetter?: boolean; logarithmic?: boolean },
    ) => normalizeAvailable(raw.map(getter), options);

    const fixedDownload = series((district) => district.network.fixed?.downloadKbps ?? null, {
      logarithmic: true,
    });
    const fixedUpload = series((district) => district.network.fixed?.uploadKbps ?? null, {
      logarithmic: true,
    });
    const fixedLatency = series((district) => district.network.fixed?.latencyMs ?? null, {
      higherIsBetter: false,
    });
    const mobileDownload = series((district) => district.network.mobile?.downloadKbps ?? null, {
      logarithmic: true,
    });
    const mobileUpload = series((district) => district.network.mobile?.uploadKbps ?? null, {
      logarithmic: true,
    });
    const mobileLatency = series((district) => district.network.mobile?.latencyMs ?? null, {
      higherIsBetter: false,
    });

    const visitors = series((district) => district.tourismVisitors?.value ?? null, {
      logarithmic: true,
    });
    const accommodationBeds = series(
      (district) => district.indicators.tourist_accommodation_beds?.value ?? null,
      { logarithmic: true },
    );
    const visitorInfrastructure = series(
      (district) => {
        const shelter = district.indicators.pilgrim_shelter_capacity?.value;
        const government = district.indicators.govt_accommodation_beds?.value;
        return shelter === undefined || government === undefined ? null : shelter + government;
      },
      { logarithmic: true },
    );

    const population = series((district) => district.indicators.population?.value ?? null, {
      logarithmic: true,
    });
    const income = series((district) => district.indicators.per_capita_income?.value ?? null, {
      logarithmic: true,
    });
    const literacy = series((district) => district.indicators.literacy_rate?.value ?? null);
    const development = series(
      (district) => district.indicators.sdg_composite_score?.value ?? null,
    );

    const milk = series((district) => district.indicators.milk_production_daily_kg?.value ?? null, {
      logarithmic: true,
    });
    const dairySocieties = series(
      (district) => district.indicators.dairy_societies?.value ?? null,
      { logarithmic: true },
    );
    const womenDairySocieties = series(
      (district) => district.indicators.women_dairy_societies?.value ?? null,
      { logarithmic: true },
    );

    const buildDetails = (
      district: RawDistrictMetrics,
      index: number,
    ): Record<MetricKey, MetricDetail> => {
      const fixed = district.network.fixed;
      const mobile = district.network.mobile;
      const connectivityScore = combine([
        [fixedDownload[index] ?? null, 25],
        [fixedUpload[index] ?? null, 15],
        [fixedLatency[index] ?? null, 15],
        [mobileDownload[index] ?? null, 20],
        [mobileUpload[index] ?? null, 10],
        [mobileLatency[index] ?? null, 15],
      ]);
      const networkFacts: EvidenceFact[] = [];
      if (fixed !== undefined) {
        networkFacts.push(
          {
            label: 'Fixed download',
            value: fixed.downloadKbps / 1000,
            unit: 'Mbps',
            vintage: fixed.vintage,
            source: fixed.source,
            sourceUrl: fixed.sourceUrl,
          },
          {
            label: 'Fixed latency',
            value: fixed.latencyMs,
            unit: 'ms',
            vintage: fixed.vintage,
            source: fixed.source,
            sourceUrl: fixed.sourceUrl,
          },
          {
            label: 'Fixed-network tests',
            value: fixed.tests,
            unit: 'tests',
            vintage: fixed.vintage,
            source: fixed.source,
            sourceUrl: fixed.sourceUrl,
          },
        );
      }
      if (mobile !== undefined) {
        networkFacts.push(
          {
            label: 'Mobile download',
            value: mobile.downloadKbps / 1000,
            unit: 'Mbps',
            vintage: mobile.vintage,
            source: mobile.source,
            sourceUrl: mobile.sourceUrl,
          },
          {
            label: 'Mobile latency',
            value: mobile.latencyMs,
            unit: 'ms',
            vintage: mobile.vintage,
            source: mobile.source,
            sourceUrl: mobile.sourceUrl,
          },
          {
            label: 'Mobile-network tests',
            value: mobile.tests,
            unit: 'tests',
            vintage: mobile.vintage,
            source: mobile.source,
            sourceUrl: mobile.sourceUrl,
          },
        );
      }

      const tourismFacts = [
        district.tourismVisitors === null
          ? null
          : fact('2025 visitor footfall', district.tourismVisitors),
        district.indicators.tourist_accommodation_units === undefined
          ? null
          : fact('Hotels, lodges and homestays', district.indicators.tourist_accommodation_units),
        district.indicators.tourist_accommodation_beds === undefined
          ? null
          : fact('Hotel and homestay beds', district.indicators.tourist_accommodation_beds),
        district.indicators.pilgrim_shelter_capacity === undefined
          ? null
          : fact('Pilgrim shelter capacity', district.indicators.pilgrim_shelter_capacity),
      ].filter((entry): entry is EvidenceFact => entry !== null);

      const marketFacts = [
        district.indicators.population === undefined
          ? null
          : fact('Population', district.indicators.population),
        district.indicators.per_capita_income === undefined
          ? null
          : fact('Per-capita income', district.indicators.per_capita_income),
        district.indicators.literacy_rate === undefined
          ? null
          : fact('Literacy rate', district.indicators.literacy_rate),
        district.indicators.sdg_composite_score === undefined
          ? null
          : fact('SDG composite score', district.indicators.sdg_composite_score),
      ].filter((entry): entry is EvidenceFact => entry !== null);

      const agricultureFacts = [
        district.indicators.milk_production_daily_kg === undefined
          ? null
          : fact('Average daily milk production', district.indicators.milk_production_daily_kg),
        district.indicators.dairy_societies === undefined
          ? null
          : fact('Dairy cooperative societies', district.indicators.dairy_societies),
        district.indicators.women_dairy_societies === undefined
          ? null
          : fact("Women's dairy cooperative societies", district.indicators.women_dairy_societies),
      ].filter((entry): entry is EvidenceFact => entry !== null);

      const agricultureIsApplicable = scenario.id === 'a1';

      return {
        connectivity: {
          available: connectivityScore !== null,
          score: connectivityScore,
          summary:
            'Latest fixed and mobile download, upload and latency, with test counts disclosed.',
          facts: networkFacts,
        },
        tourism: {
          available: visitors[index] !== null,
          score: combine([
            [visitors[index] ?? null, 70],
            [accommodationBeds[index] ?? null, 20],
            [visitorInfrastructure[index] ?? null, 10],
          ]),
          summary: '2025 demand combined with published visitor accommodation infrastructure.',
          facts: tourismFacts,
        },
        roads: unavailable(
          'Not scored: the road register is statewide and does not yet contain defensible district-level distance or route-length evidence.',
        ),
        urbanPopulation: {
          available: marketFacts.length === 4,
          score: combine([
            [population[index] ?? null, 25],
            [income[index] ?? null, 40],
            [literacy[index] ?? null, 15],
            [development[index] ?? null, 20],
          ]),
          summary: 'Market scale, purchasing power, literacy and the district development index.',
          facts: marketFacts,
        },
        agriculture: agricultureIsApplicable
          ? {
              available: agricultureFacts.length === 3,
              score: combine([
                [milk[index] ?? null, 60],
                [dairySocieties[index] ?? null, 25],
                [womenDairySocieties[index] ?? null, 15],
              ]),
              summary: 'Dairy output and cooperative collection infrastructure.',
              facts: agricultureFacts,
            }
          : unavailable(
              'Not scored for this venture: the available agriculture evidence describes dairy, not this sector’s raw-material supply.',
            ),
        safety: unavailable(
          'Not scored: the current event history is too short to represent long-term geological or climate risk.',
        ),
      };
    };

    const indexA = raw.indexOf(districtA);
    const indexB = raw.indexOf(districtB);
    const detailsA = buildDetails(districtA, indexA);
    const detailsB = buildDetails(districtB, indexB);
    const metricKeys = Object.keys(scenario.weights) as MetricKey[];
    const availableKeys = new Set(
      metricKeys.filter(
        (key) =>
          detailsA[key].available &&
          detailsB[key].available &&
          detailsA[key].score !== null &&
          detailsB[key].score !== null,
      ),
    );

    const scoresA = Object.fromEntries(
      metricKeys.map((key) => [key, detailsA[key].score]),
    ) as Record<MetricKey, number | null>;
    const scoresB = Object.fromEntries(
      metricKeys.map((key) => [key, detailsB[key].score]),
    ) as Record<MetricKey, number | null>;
    const rawScoreA = weightedScore(scoresA, scenario.weights, availableKeys);
    const rawScoreB = weightedScore(scoresB, scenario.weights, availableKeys);
    const scoreA = Math.round(rawScoreA ?? 0);
    const scoreB = Math.round(rawScoreB ?? 0);

    const requestedWeight = metricKeys.reduce(
      (total, key) => total + Math.max(0, scenario.weights[key]),
      0,
    );
    const availableWeight = metricKeys.reduce(
      (total, key) => total + (availableKeys.has(key) ? Math.max(0, scenario.weights[key]) : 0),
      0,
    );
    const coveragePct =
      requestedWeight === 0 ? 0 : Math.round((availableWeight / requestedWeight) * 100);
    const confidence: Confidence =
      coveragePct >= 75 ? 'high' : coveragePct >= 50 ? 'medium' : 'low';
    const margin = Math.abs(scoreA - scoreB);
    const hasRecommendation = confidence !== 'low';
    const isTie = margin <= 2;
    const winnerIsA = scoreA > scoreB;
    const winner = !hasRecommendation ? 'insufficient' : isTie ? 'tie' : winnerIsA ? slugA : slugB;

    let verdict: string;
    if (!hasRecommendation) {
      verdict = `Available evidence covers only ${coveragePct}% of the factors requested for ${scenario.name}, so no district recommendation is made. The partial suitability indices are shown to make the available evidence inspectable, not as a profitability forecast.`;
    } else if (isTie) {
      verdict = `${districtA.nameEn} and ${districtB.nameEn} are closely matched for ${scenario.name} on the evidence currently available (${coveragePct}% of the scenario’s requested weight).`;
    } else {
      const better = winnerIsA ? districtA : districtB;
      const other = winnerIsA ? districtB : districtA;
      const betterDetails = winnerIsA ? detailsA : detailsB;
      const otherDetails = winnerIsA ? detailsB : detailsA;
      const advantage = [...availableKeys]
        .map((key) => ({
          key,
          impact:
            ((betterDetails[key].score ?? 0) - (otherDetails[key].score ?? 0)) *
            scenario.weights[key],
        }))
        .sort((a, b) => b.impact - a.impact)[0];
      const driver =
        advantage === undefined
          ? ''
          : ` Its clearest advantage is ${METRIC_LABELS[advantage.key]}.`;
      verdict = `${better.nameEn} is the better-supported fit for ${scenario.name}, with a suitability index of ${Math.max(scoreA, scoreB)} against ${Math.min(scoreA, scoreB)} for ${other.nameEn}.${driver} This is a relative decision-support result with ${confidence} evidence confidence, not a profitability forecast.`;
    }

    const compatibilityMetrics = (
      details: Record<MetricKey, MetricDetail>,
    ): Record<MetricKey, number> =>
      Object.fromEntries(metricKeys.map((key) => [key, details[key].score ?? 50])) as Record<
        MetricKey,
        number
      >;

    return {
      winner,
      districtA: {
        slug: slugA,
        name: districtA.nameEn,
        score: scoreA,
        metrics: compatibilityMetrics(detailsA),
        metricDetails: detailsA,
      },
      districtB: {
        slug: slugB,
        name: districtB.nameEn,
        score: scoreB,
        metrics: compatibilityMetrics(detailsB),
        metricDetails: detailsB,
      },
      scenario,
      verdict,
      evidence: {
        confidence,
        coveragePct,
        availableWeight,
        requestedWeight,
        availableMetrics: [...availableKeys],
        missingMetrics: metricKeys.filter(
          (key) => scenario.weights[key] > 0 && !availableKeys.has(key),
        ),
        note: 'Scores are relative positions among Uttarakhand’s 13 districts. Missing evidence is excluded rather than converted into a zero or a neutral score.',
      },
      recommendedSchemes: recommendBusinessSchemes(scenario.category),
    };
  }
}
