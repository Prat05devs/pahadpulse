import { db } from '../database/db.js';
import { BUSINESS_SCENARIOS, type BusinessWeights, type BusinessScenario } from '../models/business-scenarios.js';

interface RawDistrictMetrics {
  areaId: number;
  slug: string;
  nameEn: string;
  connectivity: number;
  tourism: number;
  roads: number;
  urbanPopulation: number;
  agriculture: number;
  safety: number;
}

export interface ComparisonReport {
  winner: string;
  districtA: {
    slug: string;
    name: string;
    score: number;
    metrics: Record<keyof BusinessWeights, number>; // normalized 0-100
  };
  districtB: {
    slug: string;
    name: string;
    score: number;
    metrics: Record<keyof BusinessWeights, number>;
  };
  scenario: BusinessScenario;
  verdict: string;
}

/**
 * Normalizes an array of values to a 0-100 scale based on the min and max found.
 */
function normalize(values: number[], higherIsBetter = true): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return values.map(val => {
    if (range === 0) return 50; // default middle if all same
    const raw = ((val - min) / range) * 100;
    return higherIsBetter ? raw : 100 - raw;
  });
}

export class BusinessService {
  async getScenarios() {
    return BUSINESS_SCENARIOS;
  }

  async getScenarioById(id: string) {
    return BUSINESS_SCENARIOS.find((s) => s.id === id);
  }

  /**
   * Fetches the raw metrics for all 13 districts from the database.
   */
  async fetchRawMetrics(): Promise<RawDistrictMetrics[]> {
    // 1. Fetch base districts
    console.log('Fetching areas...');
    const { rows: areas } = await db.query(`
      SELECT id, slug, name_en 
      FROM areas 
      WHERE type = 'district' 
      ORDER BY id
    `);

    const metricsMap = new Map<number, RawDistrictMetrics>();
    areas.forEach((a: any) => {
      metricsMap.set(a.id, {
        areaId: a.id,
        slug: a.slug,
        nameEn: a.name_en,
        connectivity: 0,
        tourism: 0,
        roads: 0,
        urbanPopulation: 0,
        agriculture: 0,
        safety: 100
      });
    });

    console.log('Fetching tourism...');
    const { rows: tourismRows } = await db.query(`
      SELECT d.area_id, SUM(v.visitors) as total_visitors
      FROM destination_annual_visitors v
      JOIN destinations d ON v.destination_id = d.id
      GROUP BY d.area_id
    `);
    tourismRows.forEach((r: any) => {
      if (metricsMap.has(r.area_id)) {
        metricsMap.get(r.area_id)!.tourism = Number(r.total_visitors);
      }
    });

    console.log('Fetching connectivity...');
    const { rows: networkRows } = await db.query(`
      SELECT area_id, AVG(download_kbps) as avg_dl 
      FROM network_performance 
      GROUP BY area_id
    `);
    networkRows.forEach((r: any) => {
      if (metricsMap.has(r.area_id)) {
        metricsMap.get(r.area_id)!.connectivity = Number(r.avg_dl);
      }
    });

    areas.forEach((r: any) => {
      if (metricsMap.has(r.id)) {
        metricsMap.get(r.id)!.roads = 100;
      }
    });

    console.log('Fetching urban pop...');
    const { rows: popRows } = await db.query(`
      SELECT area_id, MAX(value) as pop
      FROM indicator_values 
      WHERE indicator_key = 'CEN_POP_URBAN'
      GROUP BY area_id
    `);
    popRows.forEach((r: any) => {
      if (metricsMap.has(r.area_id)) {
        metricsMap.get(r.area_id)!.urbanPopulation = Number(r.pop);
      }
    });

    console.log('Fetching agriculture...');
    const { rows: dairyRows } = await db.query(`
      SELECT area_id, MAX(value) as milk
      FROM indicator_values
      WHERE indicator_key = 'DAIRY_MILK_PRODUCTION'
      GROUP BY area_id
    `);
    dairyRows.forEach((r: any) => {
      if (metricsMap.has(r.area_id)) {
        metricsMap.get(r.area_id)!.agriculture = Number(r.milk);
      }
    });
    console.log('Queries done.');

    // 7. Fetch Safety (Seismic risk)
    // Seismic events don't have area_id. We'd need PostGIS.
    // For now, baseline safety.
    areas.forEach((r: any) => {
      if (metricsMap.has(r.id)) {
        metricsMap.get(r.id)!.safety = 100;
      }
    });

    return Array.from(metricsMap.values());
  }

  async compareDistricts(slugA: string, slugB: string, scenarioId: string): Promise<ComparisonReport> {
    const scenario = await this.getScenarioById(scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    const rawMetrics = await this.fetchRawMetrics();
    
    const distA = rawMetrics.find((r) => r.slug === slugA);
    const distB = rawMetrics.find((r) => r.slug === slugB);
    if (!distA || !distB) throw new Error('One or both districts not found');

    // 1. Extract values for all 13 districts to compute accurate 0-100 normalized scales
    const connectivities = rawMetrics.map(r => r.connectivity);
    const tourisms = rawMetrics.map(r => r.tourism);
    const roadss = rawMetrics.map(r => r.roads);
    const populations = rawMetrics.map(r => r.urbanPopulation);
    const agricultures = rawMetrics.map(r => r.agriculture);
    const safeties = rawMetrics.map(r => r.safety); // Note: safety is currently negative risk. Higher is better.

    // 2. Normalize
    const normConnectivities = normalize(connectivities);
    const normTourisms = normalize(tourisms);
    const normRoadss = normalize(roadss);
    const normPopulations = normalize(populations);
    const normAgricultures = normalize(agricultures);
    const normSafeties = normalize(safeties); // already set higher is better

    // 3. Attach normalized scores to our targets
    const idxA = rawMetrics.findIndex(r => r.slug === slugA);
    const idxB = rawMetrics.findIndex(r => r.slug === slugB);

    const metricsA = {
      connectivity: normConnectivities[idxA] || 0,
      tourism: normTourisms[idxA] || 0,
      roads: normRoadss[idxA] || 0,
      urbanPopulation: normPopulations[idxA] || 0,
      agriculture: normAgricultures[idxA] || 0,
      safety: normSafeties[idxA] || 0,
    };

    const metricsB = {
      connectivity: normConnectivities[idxB] || 0,
      tourism: normTourisms[idxB] || 0,
      roads: normRoadss[idxB] || 0,
      urbanPopulation: normPopulations[idxB] || 0,
      agriculture: normAgricultures[idxB] || 0,
      safety: normSafeties[idxB] || 0,
    };

    // 4. Compute Weighted Scores
    const w = scenario.weights;
    const computeScore = (m: Record<keyof BusinessWeights, number>) => {
      let totalWeight = 0;
      let totalScore = 0;
      
      const apply = (key: keyof BusinessWeights) => {
        totalWeight += w[key];
        totalScore += m[key] * w[key];
      };

      apply('connectivity');
      apply('tourism');
      apply('roads');
      apply('urbanPopulation');
      apply('agriculture');
      apply('safety');

      return totalWeight === 0 ? 0 : totalScore / totalWeight;
    };

    const scoreA = Math.round(computeScore(metricsA));
    const scoreB = Math.round(computeScore(metricsB));

    const winner = scoreA > scoreB ? distA.nameEn : scoreB > scoreA ? distB.nameEn : 'Tie';
    
    let verdict = '';
    if (winner === 'Tie') {
      verdict = `Both ${distA.nameEn} and ${distB.nameEn} are equally viable for a ${scenario.name} business, presenting similar infrastructural and market conditions.`;
    } else {
      const best = scoreA > scoreB ? distA.nameEn : distB.nameEn;
      const worst = scoreA > scoreB ? distB.nameEn : distA.nameEn;
      const metricsBest = scoreA > scoreB ? metricsA : metricsB;
      const metricsWorst = scoreA > scoreB ? metricsB : metricsA;

      // Find biggest advantage
      let bestAdvantageKey = '';
      let bestAdvantageDiff = -1;
      
      for (const key of Object.keys(w) as (keyof BusinessWeights)[]) {
        if (w[key] !== undefined && w[key] > 0) {
          const diff = (metricsBest[key] || 0) - (metricsWorst[key] || 0);
          if (diff > bestAdvantageDiff) {
            bestAdvantageDiff = diff;
            bestAdvantageKey = key;
          }
        }
      }

      const featureNames: Record<string, string> = {
        connectivity: 'digital connectivity and internet performance',
        tourism: 'tourism footfall and visibility',
        roads: 'road network and physical infrastructure',
        urbanPopulation: 'local urban market size and workforce availability',
        agriculture: 'agricultural / raw material output',
        safety: 'geological safety and lower disruption risks'
      };

      verdict = `${best} strongly outperforms ${worst} for a ${scenario.name} venture, achieving an Ease of Doing Business score of ${Math.max(scoreA, scoreB)} vs ${Math.min(scoreA, scoreB)}. `;
      if (bestAdvantageDiff > 20 && bestAdvantageKey) {
        verdict += `This is primarily driven by its vastly superior ${featureNames[bestAdvantageKey]}, which is heavily weighted for this sector.`;
      } else {
        verdict += `It maintains a consistent lead across most relevant factors.`;
      }
    }

    return {
      winner: winner === 'Tie' ? 'tie' : (scoreA > scoreB ? slugA : slugB),
      districtA: {
        slug: slugA,
        name: distA.nameEn,
        score: scoreA,
        metrics: metricsA,
      },
      districtB: {
        slug: slugB,
        name: distB.nameEn,
        score: scoreB,
        metrics: metricsB,
      },
      scenario,
      verdict,
    };
  }
}
