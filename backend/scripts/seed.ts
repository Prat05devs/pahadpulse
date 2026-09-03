/**
 * Development seed — placeholder boundaries and a demo tehsil/village hierarchy.
 *
 * This is NOT reference data. The 13 districts ship as migration 002 because every
 * environment needs them; everything created here is invented and exists only so the
 * geography endpoints and the map have something to return before official data arrives.
 *
 * Every row created here is marked so it cannot be mistaken for real data:
 *   - boundaries carry `is_placeholder = TRUE` and a `source_note` saying so
 *   - demo tehsils and villages carry a `DEMO-` code prefix
 *
 * Idempotent (M9). Refuses to run against production.
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { DEMO_SOURCE_KEY } from '../src/config/constants.js';
import { env } from '../src/config/env.js';
import { db } from '../src/database/db.js';
import { AreaType } from '../src/types/area.js';
import createLogger from '../src/utils/logger.js';

const logger = createLogger('@seed');

const PLACEHOLDER_NOTE =
  'Generated placeholder geometry — not official boundary data. Replace with Survey of India / Bhuvan / OSM data.';

interface DistrictRow extends RowDataPacket {
  id: number;
  slug: string;
  code: string;
  name_en: string;
  name_hi: string;
  centroid_lat: string | null;
  centroid_lng: string | null;
}

/**
 * A hexagon around the district's representative point.
 *
 * Deliberately hexagonal rather than an approximated real outline: a shape nobody could
 * mistake for a survey boundary is safer than a plausible-looking wrong one.
 */
function placeholderHexagon(lat: number, lng: number, radiusDeg: number): unknown {
  const latitudeCorrection = Math.cos((lat * Math.PI) / 180) || 1;
  const points: [number, number][] = [];

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const pointLng = lng + (radiusDeg / latitudeCorrection) * Math.cos(angle);
    const pointLat = lat + radiusDeg * Math.sin(angle);
    points.push([Number(pointLng.toFixed(6)), Number(pointLat.toFixed(6))]);
  }
  points.push(points[0] as [number, number]); // GeoJSON rings must close

  return { type: 'Polygon', coordinates: [points] };
}

async function seedBoundaries(districts: DistrictRow[]): Promise<number> {
  let written = 0;

  for (const district of districts) {
    if (district.centroid_lat === null || district.centroid_lng === null) {
      logger.warn('district has no centroid, skipping boundary', { slug: district.slug });
      continue;
    }

    // Vary the radius a little so the map is not a tiling of identical shapes.
    const radius = 0.18 + (district.id % 5) * 0.02;
    const geometry = placeholderHexagon(
      Number(district.centroid_lat),
      Number(district.centroid_lng),
      radius,
    );

    await db.query<ResultSetHeader>(
      `INSERT INTO area_boundaries (area_id, geojson, simplified_geojson, is_placeholder, source_note)
       VALUES (?, CAST(? AS JSON), CAST(? AS JSON), TRUE, ?) AS new
       ON DUPLICATE KEY UPDATE
         geojson            = new.geojson,
         simplified_geojson = new.simplified_geojson,
         is_placeholder     = new.is_placeholder,
         source_note        = new.source_note`,
      [JSON.stringify(geometry), JSON.stringify(geometry), PLACEHOLDER_NOTE],
    );
    written += 1;
  }

  return written;
}

async function seedDemoHierarchy(
  districts: DistrictRow[],
): Promise<{ tehsils: number; villages: number }> {
  let tehsils = 0;
  let villages = 0;

  for (const district of districts) {
    for (let t = 1; t <= 3; t += 1) {
      const tehsilCode = `DEMO-${district.code}-T${t}`;
      const tehsilSlug = `${district.slug}-demo-tehsil-${t}`;

      await db.query<ResultSetHeader>(
        `INSERT INTO areas (type, code, slug, name_en, name_hi, parent_id) VALUES (?, ?, ?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE slug = new.slug, name_en = new.name_en, name_hi = new.name_hi`,
        [
          AreaType.Tehsil,
          tehsilCode,
          tehsilSlug,
          `${district.name_en} Demo Tehsil ${t}`,
          `${district.name_hi} डेमो तहसील ${t}`,
          district.id,
        ],
      );

      const [tehsilRows] = await db.query<RowDataPacket[]>(
        'SELECT id FROM areas WHERE type = ? AND code = ? LIMIT 1',
        [AreaType.Tehsil, tehsilCode],
      );
      const tehsilId = (tehsilRows[0] as { id: number } | undefined)?.id;
      if (tehsilId === undefined) continue;
      tehsils += 1;

      for (let v = 1; v <= 4; v += 1) {
        await db.query<ResultSetHeader>(
          `INSERT INTO areas (type, code, slug, name_en, name_hi, parent_id) VALUES (?, ?, ?, ?, ?, ?) AS new
           ON DUPLICATE KEY UPDATE slug = new.slug, name_en = new.name_en, name_hi = new.name_hi`,
          [
            AreaType.Village,
            `DEMO-${district.code}-T${t}-V${v}`,
            `${tehsilSlug}-demo-village-${v}`,
            `${district.name_en} Demo Village ${t}.${v}`,
            `${district.name_hi} डेमो गांव ${t}.${v}`,
            tehsilId,
          ],
        );
        villages += 1;
      }
    }
  }

  return { tehsils, villages };
}

// --- indicator demo data ---
//
// Every value below is FABRICATED for demonstration — no district's real population,
// income or literacy rate. Deterministic (not Math.random()) so re-running the seed
// produces the same numbers rather than drifting, which matters for a repeatable demo.
// Honesty is carried structurally, not just by convention: the values are attributed to
// a `sources` row whose department name and attribution string say "DEMO DATA" outright,
// so every API response carrying these values names them as synthetic (DS-1, DS-6).

interface IndicatorDemoDef {
  key: string;
  baseline: number;
  /** 0 = the district's size weight has no effect; 1 = value scales directly with it. */
  weightSensitivity: number;
  /** +/- fraction of baseline applied as jitter. */
  variance: number;
  /** Fractional change applied per vintage step, to show a plausible trend. */
  trendPerVintage: number;
  decimals: number;
  clampMin: number;
  clampMax?: number;
}

const INDICATOR_DEMO_DEFS: readonly IndicatorDemoDef[] = [
  {
    key: 'population',
    baseline: 700_000,
    weightSensitivity: 1,
    variance: 0.15,
    trendPerVintage: 0.03,
    decimals: 0,
    clampMin: 5_000,
  },
  {
    key: 'literacy_rate',
    baseline: 78,
    weightSensitivity: 0.15,
    variance: 0.12,
    trendPerVintage: 0.01,
    decimals: 1,
    clampMin: 40,
    clampMax: 99,
  },
  {
    key: 'sex_ratio',
    baseline: 960,
    weightSensitivity: 0,
    variance: 0.05,
    trendPerVintage: 0,
    decimals: 0,
    clampMin: 850,
    clampMax: 1_050,
  },
  {
    key: 'schools_count',
    baseline: 450,
    weightSensitivity: 0.9,
    variance: 0.2,
    trendPerVintage: 0.02,
    decimals: 0,
    clampMin: 20,
  },
  {
    key: 'school_enrollment_rate',
    baseline: 85,
    weightSensitivity: 0.1,
    variance: 0.1,
    trendPerVintage: 0.01,
    decimals: 1,
    clampMin: 50,
    clampMax: 99,
  },
  {
    key: 'health_facilities_count',
    baseline: 60,
    weightSensitivity: 0.9,
    variance: 0.25,
    trendPerVintage: 0.02,
    decimals: 0,
    clampMin: 5,
  },
  {
    key: 'hospital_beds_per_1000',
    baseline: 1.1,
    weightSensitivity: 0.2,
    variance: 0.3,
    trendPerVintage: 0.02,
    decimals: 2,
    clampMin: 0.1,
  },
  {
    key: 'per_capita_income',
    baseline: 140_000,
    weightSensitivity: 0.6,
    variance: 0.2,
    trendPerVintage: 0.05,
    decimals: 0,
    clampMin: 40_000,
  },
  {
    key: 'registered_industries_count',
    baseline: 120,
    weightSensitivity: 1,
    variance: 0.3,
    trendPerVintage: 0.03,
    decimals: 0,
    clampMin: 5,
  },
  {
    key: 'internet_penetration_pct',
    baseline: 50,
    weightSensitivity: 0.2,
    variance: 0.15,
    trendPerVintage: 0.08,
    decimals: 1,
    clampMin: 10,
    clampMax: 98,
  },
];

/** Three plausibly-spaced report dates. Not claimed as real reporting years — demo only. */
const DEMO_VINTAGES = ['2015-04-01', '2019-04-01', '2023-04-01'] as const;

/** FNV-1a — a small, dependency-free string hash. Deterministic across Node versions. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a small deterministic PRNG seeded from the hash above. */
function seededRandom(seedKey: string): number {
  let t = hashString(seedKey) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

/** Each district's synthetic "size" weight, stable across runs, in roughly 0.5x–2.0x. */
function districtWeight(districtCode: string): number {
  return 0.5 + seededRandom(`weight:${districtCode}`) * 1.5;
}

function demoValue(
  def: IndicatorDemoDef,
  weight: number,
  vintageIndex: number,
  rand: number,
): number {
  const weighted = def.baseline * (1 + (weight - 1) * def.weightSensitivity);
  const trended = weighted * (1 + def.trendPerVintage * vintageIndex);
  const jittered = trended * (1 + (rand - 0.5) * 2 * def.variance);
  const clamped = Math.max(
    def.clampMin,
    def.clampMax === undefined ? jittered : Math.min(def.clampMax, jittered),
  );
  const factor = 10 ** def.decimals;
  return Math.round(clamped * factor) / factor;
}

/** Inserts (or refreshes) the source row every demo value is attributed to. Returns its id. */
async function ensureDemoSource(): Promise<number> {
  await db.query<ResultSetHeader>(
    `INSERT INTO sources
       (source_key, owner_module, department_en, department_hi, url, attribution, licence,
        access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
     VALUES (?, 'indicators', ?, ?, ?, ?, ?, 'manual', 'static', TRUE, 'provisional', ?, FALSE)
     AS new
     ON DUPLICATE KEY UPDATE
       department_en = new.department_en, department_hi = new.department_hi,
       url = new.url, attribution = new.attribution, licence = new.licence,
       metadata_note = new.metadata_note`,
    [
      DEMO_SOURCE_KEY,
      'Pahad Pulse (internal demo dataset)',
      'पहाड़ पल्स (आंतरिक डेमो डेटासेट)',
      'urn:pahad-pulse:demo-data',
      'DEMO DATA — synthetic values generated for development and demonstration. Not an official government figure. Do not cite.',
      'Internal — not an authoritative source',
      'Synthetic demo data generated by scripts/seed.ts. Replace once the data.gov.in / Directorate of Economics & Statistics connectors are implemented (indicators.md §9). is_enabled is FALSE: there is no connector, and none should ever run for this key.',
    ],
  );

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM sources WHERE source_key = ? LIMIT 1',
    [DEMO_SOURCE_KEY],
  );
  const id = (rows[0] as { id: number } | undefined)?.id;
  if (id === undefined) throw new Error('failed to create the demo source row');
  return id;
}

async function seedIndicatorDemoValues(
  districts: DistrictRow[],
  demoSourceId: number,
): Promise<number> {
  let written = 0;

  for (const district of districts) {
    const weight = districtWeight(district.code);

    for (const def of INDICATOR_DEMO_DEFS) {
      for (const [vintageIndex, vintage] of DEMO_VINTAGES.entries()) {
        const rand = seededRandom(`${district.code}:${def.key}:${vintage}`);
        const value = demoValue(def, weight, vintageIndex, rand);

        await db.query<ResultSetHeader>(
          `INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
           VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
           AS new
           ON DUPLICATE KEY UPDATE value = new.value, source_id = new.source_id, fetched_at = new.fetched_at`,
          [def.key, district.id, vintage, value, demoSourceId],
        );
        written += 1;
      }
    }
  }

  return written;
}

async function run(): Promise<void> {
  if (env.APP_ENV === 'production') {
    logger.error('refusing to seed production');
    process.exit(1);
  }

  try {
    const [districts] = await db.query<DistrictRow[]>(
      `SELECT id, slug, code, name_en, name_hi, centroid_lat, centroid_lng
         FROM areas WHERE type = ? ORDER BY id ASC`,
      [AreaType.District],
    );

    if (districts.length === 0) {
      logger.error('no districts found — run `npm run db:migrate` first');
      process.exit(1);
    }

    const boundaries = await seedBoundaries(districts);
    const { tehsils, villages } = await seedDemoHierarchy(districts);

    const demoSourceId = await ensureDemoSource();
    const indicatorValues = await seedIndicatorDemoValues(districts, demoSourceId);

    logger.info('seed complete', {
      districts: districts.length,
      boundaries,
      demoTehsils: tehsils,
      demoVillages: villages,
      demoIndicatorValues: indicatorValues,
    });
  } finally {
    await db.end();
  }
}

run().catch((error: unknown) => {
  logger.error('seed failed', { error });
  process.exit(1);
});
