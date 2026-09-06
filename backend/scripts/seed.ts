/**
 * Development seed — placeholder district boundaries only.
 *
 * This is NOT reference data. The 13 districts, the 117 tehsils, the source registry, the
 * indicator catalogue and the weather stations all ship as migrations because every
 * environment needs them identically. The only thing left for a dev seed is geometry: the
 * map needs something to draw before the OpenStreetMap ingestion has run, and Overpass
 * takes about eighty seconds.
 *
 * WHAT THIS NO LONGER DOES. It used to generate a demo tehsil/village hierarchy and demo
 * indicator values. Both are gone: real tehsils are migration 011, real district figures
 * are migration 032, and villages come from OSM. Generating DEMO- rows alongside real ones
 * would now put invented districts and fabricated statistics next to published ones, which
 * is the single failure this product's provenance rules exist to prevent.
 *
 * Every boundary written here is marked `is_placeholder = TRUE` and carries a source note
 * saying so, and the API surfaces that flag (GEO-7) so nothing can mistake a generated
 * hexagon for a survey boundary.
 */

import { env } from '../src/config/env.js';
import { db } from '../src/database/db.js';
import { AreaType } from '../src/types/area.js';
import createLogger from '../src/utils/logger.js';

const logger = createLogger('@seed');

const PLACEHOLDER_NOTE =
  'Generated placeholder geometry — not official boundary data. Replace with Survey of India / Bhuvan / OSM data.';

interface DistrictRow {
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

    await db.query(
      `INSERT INTO area_boundaries (area_id, geom, simplified_geom, is_placeholder, source_note)
       VALUES (
         $1,
         ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)),
         ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)),
         TRUE, $3
       )
       ON CONFLICT (area_id) DO UPDATE SET
         geom            = EXCLUDED.geom,
         simplified_geom = EXCLUDED.simplified_geom,
         is_placeholder  = EXCLUDED.is_placeholder,
         source_note     = EXCLUDED.source_note`,
      [district.id, JSON.stringify(geometry), PLACEHOLDER_NOTE],
    );
    written += 1;
  }

  return written;
}

async function run(): Promise<void> {
  if (env.APP_ENV === 'production') {
    logger.error('refusing to seed production');
    process.exit(1);
  }

  try {
    const { rows: districts } = await db.query<DistrictRow>(
      `SELECT id, slug, code, name_en, name_hi,
              ST_Y(centroid::geometry) AS centroid_lat,
              ST_X(centroid::geometry) AS centroid_lng
         FROM areas WHERE type = $1 ORDER BY id ASC`,
      [AreaType.District],
    );

    if (districts.length === 0) {
      logger.error('no districts found — run `npm run db:migrate` first');
      process.exit(1);
    }

    const boundaries = await seedBoundaries(districts);

    logger.info('seed complete', { boundaries });
  } finally {
    await db.end();
  }
}

run().catch((error: unknown) => {
  logger.error('seed failed', { error });
  process.exit(1);
});
