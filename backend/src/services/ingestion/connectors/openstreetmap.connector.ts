import { err, ok, type Result } from 'neverthrow';

import {
  BOUNDARY_SIMPLIFY_TOLERANCE_DEGREES,
  OVERPASS,
  UTTARAKHAND_DISTRICT_COUNT,
} from '../../../config/constants.js';
import { AreaRepository } from '../../../repositories/area.repository.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import {
  assembleRings,
  countPositions,
  simplifyGeometry,
  type Geometry,
  type Position,
} from '../../../utils/geojson.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import {
  matchRelationToDistrict,
  matchTehsilName,
  parseOverpassPlaces,
  parseOverpassRelations,
} from './openstreetmap.parser.js';

const logger = createLogger('@openstreetmap.connector');

/**
 * OpenStreetMap — administrative boundaries via Overpass.
 *
 * The third shape in the spine: a keyed REST catalog (data.gov.in), an XML feed (IMD CAP),
 * and this bulk geo extract.
 *
 * Owned by `geography` for boundary and place geometry; `roads` will later add its own
 * OSM-backed connector for highway geometry, under a different source key. One source key
 * has exactly one owning module (DS-7).
 *
 * This replaces the placeholder hexagons seeded by `scripts/seed.ts` and sets
 * `is_placeholder = FALSE`, which is the flag every consumer reads to know whether the
 * geometry is real (GEO-7).
 *
 * ODbL requires attribution on every map surface. The registry already carries the exact
 * string ("Map data (c) OpenStreetMap contributors, ODbL") and the map component renders it.
 *
 * VERIFIED 2026-09-04: Uttarakhand is OSM relation 9987086 (`ISO3166-2=IN-UK`), and India's
 * districts sit at `admin_level=5` — the query returns exactly our 13, each of which
 * assembles into exactly one closed ring. `admin_level=6` returns the 80 tehsils instead.
 */
class OpenStreetMapConnector implements SourceConnector {
  readonly sourceKey = 'openstreetmap';
  readonly ownerModule = 'geography';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(_context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const districts = await AreaRepository.listDistrictNames();
    if (districts.isErr()) return err(districts.error);

    const body = await this.fetchFromAnyMirror();
    if (body.isErr()) return err(body.error);

    const relations = parseOverpassRelations(body.value);
    if (relations.isErr()) return err(relations.error);

    let written = 0;
    let rejected = 0;
    const unmatched: string[] = [];

    for (const relation of relations.value) {
      const district = matchRelationToDistrict(relation.name, districts.value);
      if (district === null) {
        unmatched.push(relation.name);
        continue;
      }

      const rings = assembleRings(relation.ways);
      if (rings.length === 0) {
        // A boundary that does not close is not a boundary. Leaving the existing row alone
        // keeps the placeholder, which is honest, rather than writing a torn outline (DS-4:
        // a failed fetch never removes or degrades what we already have).
        logger.warn('relation produced no closed ring; leaving the existing boundary in place', {
          name: relation.name,
          ways: relation.ways.length,
        });
        rejected += 1;
        continue;
      }

      const geometry: Geometry =
        rings.length === 1
          ? { type: 'Polygon', coordinates: [rings[0] as Position[]] }
          : { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) };

      const simplified = simplifyGeometry(geometry, BOUNDARY_SIMPLIFY_TOLERANCE_DEGREES);

      logger.info('boundary assembled', {
        district: district.nameEn,
        rings: rings.length,
        points: countPositions(geometry),
        simplifiedPoints: countPositions(simplified),
      });

      const upserted = await AreaRepository.upsertBoundary({
        areaId: district.id,
        geojson: geometry,
        simplifiedGeojson: simplified,
        isPlaceholder: false,
        sourceNote: `OpenStreetMap relation, admin_level=${OVERPASS.DISTRICT_ADMIN_LEVEL}, via Overpass. Map data (c) OpenStreetMap contributors, ODbL.`,
      });
      if (upserted.isErr()) {
        rejected += 1;
        continue;
      }

      written += 1;
    }

    if (unmatched.length > 0) {
      logger.warn('some OSM relations did not match a district', { unmatched });
    }

    // Not fatal — partial real geometry beats none, and the run report carries the shortfall
    // so it is visible rather than silently accepted.
    const notes =
      written === UTTARAKHAND_DISTRICT_COUNT
        ? `All ${written} district boundaries updated from OpenStreetMap.`
        : `${written} of ${UTTARAKHAND_DISTRICT_COUNT} district boundaries updated; ${rejected} rejected` +
          (unmatched.length > 0 ? `; unmatched relations: ${unmatched.join(', ')}` : '') +
          '. The rest keep their previous geometry.';

    // Villages run after boundaries because both come from the same source and the same
    // run; a failure here degrades to "no villages this time" rather than failing the
    // boundaries that already succeeded.
    const villages = await this.ingestVillages();

    return ok({
      rowsWritten: written + villages.written,
      rowsRejected: rejected,
      // OSM has no single vintage — it is continuously edited — so the honest answer is that
      // the source states none (DS-2 forbids substituting today's date for a real vintage).
      vintage: null,
      notes: `${notes} ${villages.note}`,
    });
  }

  /**
   * Villages, placed inside the tehsil whose polygon contains them.
   *
   * OSM has no "which tehsil is this village in" tag — the relationship is purely
   * geographic, so it has to be computed: fetch the tehsil polygons, fetch the named place
   * nodes, and test each point against each polygon. A bounding-box check runs first so the
   * ray cast only sees genuine candidates; without it this is 13,000 × 78 full polygon tests.
   *
   * Best-effort by design. A village outside every matched tehsil is skipped rather than
   * guessed into the nearest one, and the count is reported so the shortfall is visible.
   */
  private async ingestVillages(): Promise<{ written: number; note: string }> {
    const tehsils = await AreaRepository.listTehsils();
    if (tehsils.isErr()) return { written: 0, note: 'Villages skipped: tehsil list unavailable.' };

    const boundaryBody = await this.fetchFromAnyMirror(OVERPASS.TEHSIL_ADMIN_LEVEL);
    if (boundaryBody.isErr()) {
      return { written: 0, note: 'Villages skipped: tehsil boundaries unavailable.' };
    }

    const relations = parseOverpassRelations(boundaryBody.value);
    if (relations.isErr()) {
      return { written: 0, note: 'Villages skipped: tehsil boundaries unparseable.' };
    }

    const candidates = tehsils.value.map((tehsil) => ({ key: tehsil.slug, name: tehsil.nameEn }));
    const bySlug = new Map(tehsils.value.map((tehsil) => [tehsil.slug, tehsil]));

    /*
     * Tehsil boundaries are STORED rather than held in memory for the length of this run.
     *
     * They used to be parsed, matched, and thrown away every time, purely to feed an
     * in-process point-in-polygon pass. Persisting them makes the placement below a plain
     * SQL join against a spatial index, and makes the boundaries themselves queryable data
     * — the map can draw tehsils now, which it never could before.
     */
    let boundariesStored = 0;
    let unmatchedPolygons = 0;

    for (const relation of relations.value) {
      const slug = matchTehsilName(relation.name, candidates);
      const tehsil = slug === null ? undefined : bySlug.get(slug);
      if (tehsil === undefined) {
        unmatchedPolygons += 1;
        continue;
      }

      const rings = assembleRings(relation.ways);
      if (rings.length === 0) continue;

      const geometry: Geometry =
        rings.length === 1
          ? { type: 'Polygon', coordinates: [rings[0] as Position[]] }
          : { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) };

      const upserted = await AreaRepository.upsertBoundary({
        areaId: tehsil.id,
        geojson: geometry,
        simplifiedGeojson: simplifyGeometry(geometry, BOUNDARY_SIMPLIFY_TOLERANCE_DEGREES),
        isPlaceholder: false,
        sourceNote: `OpenStreetMap relation, admin_level=${OVERPASS.TEHSIL_ADMIN_LEVEL}, via Overpass. Map data (c) OpenStreetMap contributors, ODbL.`,
      });
      if (upserted.isOk()) boundariesStored += 1;
    }

    if (boundariesStored === 0) {
      return { written: 0, note: 'Villages skipped: no tehsil boundary could be stored.' };
    }

    const placeBody = await this.fetchPlaces();
    if (placeBody.isErr()) return { written: 0, note: 'Villages skipped: place nodes unavailable.' };

    const places = parseOverpassPlaces(placeBody.value);
    if (places.isErr()) return { written: 0, note: 'Villages skipped: place nodes unparseable.' };

    /*
     * Placement happens in the database now.
     *
     * What stood here was a ray cast per ring with a bounding-box pre-filter, run for every
     * place against every tehsil — a spatial index reimplemented by hand, in TypeScript,
     * over polygons that had to be parsed into memory first. `ST_Covers` against the GIST
     * index does the same test, and the slug de-duplication that needed a `Set` is now a
     * window function that produces the same suffixes stably across runs.
     */
    const stored = await AreaRepository.replaceVillagesByGeometry(
      places.value.map((place) => ({
        osmId: place.osmId,
        name: place.name,
        nameHi: place.nameHi,
        lat: place.lat,
        lng: place.lng,
      })),
    );
    if (stored.isErr()) return { written: 0, note: 'Villages skipped: write failed.' };

    if (unmatchedPolygons > 0) {
      logger.warn('some OSM tehsil relations did not match a known tehsil', {
        count: unmatchedPolygons,
      });
    }

    return {
      written: stored.value.placed,
      note:
        `${stored.value.placed} villages placed across ${boundariesStored} tehsils; ` +
        `${stored.value.unplaced} fell outside every stored tehsil boundary and were skipped.`,
    };
  }

  /** Named `place=village|hamlet` nodes across the state. */
  private async fetchPlaces(): Promise<Result<string, RequestError>> {
    const query = [
      '[out:json][timeout:300];',
      `area(${3600000000 + OVERPASS.STATE_RELATION_ID})->.uk;`,
      'node["place"~"^(village|hamlet)$"]["name"](area.uk);',
      'out tags center;',
    ].join('\n');

    let lastError: RequestError = ERRORS.UPSTREAM_UNAVAILABLE;

    for (const mirror of OVERPASS.MIRRORS) {
      const response = await fetchText(`${mirror}?data=${encodeURIComponent(query)}`, {
        timeoutMs: OVERPASS.FETCH_TIMEOUT_MS,
        retries: OVERPASS.FETCH_RETRIES,
        headers: { 'User-Agent': OVERPASS.USER_AGENT },
      });
      if (response.isErr()) {
        lastError = response.error;
        continue;
      }
      if (parseOverpassPlaces(response.value).isErr()) {
        lastError = ERRORS.UPSTREAM_RESPONSE_INVALID;
        continue;
      }
      return ok(response.value);
    }

    return err(lastError);
  }

  /**
   * Tries each Overpass mirror in turn.
   *
   * These are volunteer-run and answer "the server is probably too busy" under load — the
   * main instance did so on two of three attempts while this connector was written. A
   * mirror that is busy returns HTTP 200 with an HTML error page, so a successful fetch is
   * not enough; `parseOverpassRelations` rejecting the body is what actually detects it,
   * and that is why the loop checks the parse rather than the status.
   */
  private async fetchFromAnyMirror(
    adminLevel: number = OVERPASS.DISTRICT_ADMIN_LEVEL,
  ): Promise<Result<string, RequestError>> {
    const query = [
      '[out:json][timeout:300];',
      `area(${3600000000 + OVERPASS.STATE_RELATION_ID})->.uk;`,
      `relation["boundary"="administrative"]["admin_level"="${adminLevel}"](area.uk);`,
      'out geom;',
    ].join('\n');

    let lastError: RequestError = ERRORS.UPSTREAM_UNAVAILABLE;

    for (const mirror of OVERPASS.MIRRORS) {
      const response = await fetchText(`${mirror}?data=${encodeURIComponent(query)}`, {
        timeoutMs: OVERPASS.FETCH_TIMEOUT_MS,
        retries: OVERPASS.FETCH_RETRIES,
        // Overpass's usage policy requires a client that identifies itself, and the main
        // instance answers 406 Not Acceptable without one. Anonymous requests also get
        // rate-limited first when a mirror is under load.
        headers: { 'User-Agent': OVERPASS.USER_AGENT },
      });

      if (response.isErr()) {
        lastError = response.error;
        logger.warn('Overpass mirror failed', { mirror, code: response.error.code });
        continue;
      }

      if (parseOverpassRelations(response.value).isErr()) {
        lastError = ERRORS.UPSTREAM_RESPONSE_INVALID;
        logger.warn('Overpass mirror answered but not with usable JSON (probably busy)', {
          mirror,
        });
        continue;
      }

      logger.info('Overpass mirror answered', { mirror });
      return ok(response.value);
    }

    return err(lastError);
  }
}

export const openStreetMapConnector: SourceConnector = new OpenStreetMapConnector();
