/**
 * Imports the checked-in Ministry of Panchayati Raj LGD village snapshot.
 *
 * This is intentionally separate from the SQL migrations: the government CSV contains
 * more than 17,000 rows and is auditable in its original tabular form. A SHA-256 checkpoint
 * makes normal application starts a no-op after a successful import. All writes happen in
 * one transaction, so a malformed or partially imported directory can never go live.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PoolClient } from 'pg';

import { db } from '../src/database/db.js';
import { bulkValues } from '../src/database/sql.js';
import createLogger from '../src/utils/logger.js';
import { describeError } from '../src/utils/describe-error.js';

const logger = createLogger('@import-lgd-villages');
const DATASET_KEY = 'mopr-lgd-villages';
const IMPORT_VERSION = '2';
const EXPECTED_DISTRICTS = 13;
const EXPECTED_SUBDISTRICTS = 129;
const EXPECTED_UNIQUE_VILLAGES = 17_343;
// Serialises this dataset import across rolling deploys and horizontally scaled instances.
// The number is private to this application; transaction-scoped locks release on commit/rollback.
const IMPORT_ADVISORY_LOCK = 724_002;
const SNAPSHOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'uttarakhand-lgd-villages.csv',
);

interface VillageRow {
  villageCode: string;
  nameEn: string;
  nameHi: string | null;
  censusCode: string | null;
  subdistrictCode: string;
  subdistrictName: string;
  subdistrictCensusCode: string | null;
  districtCode: string;
  districtName: string;
  districtCensusCode: string | null;
  updatedAt: string;
}

interface DistrictRow {
  id: number;
  slug: string;
  name_en: string;
  division: 'garhwal' | 'kumaon';
}

interface TehsilRow {
  id: number;
  code: string;
  slug: string;
  name_en: string;
  district_name: string;
}

interface DirectoryCounts {
  villages: number;
  official_villages: number;
  tehsils: number;
  official_tehsils: number;
}

async function directoryIsHealthy(client: PoolClient): Promise<boolean> {
  const result = await client.query<DirectoryCounts>(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'village')::int AS villages,
       COUNT(*) FILTER (WHERE type = 'village' AND code LIKE 'LGD-V-%')::int AS official_villages,
       COUNT(*) FILTER (WHERE type = 'tehsil')::int AS tehsils,
       COUNT(DISTINCT lgd_code) FILTER (WHERE type = 'tehsil')::int AS official_tehsils
     FROM areas`,
  );
  const counts = result.rows[0];
  return (
    counts?.villages === EXPECTED_UNIQUE_VILLAGES &&
    counts.official_villages === EXPECTED_UNIQUE_VILLAGES &&
    counts.tehsils === EXPECTED_SUBDISTRICTS &&
    counts.official_tehsils === EXPECTED_SUBDISTRICTS
  );
}

/** RFC 4180 parser kept local so the immutable source snapshot needs no runtime package. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] ?? '';
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (quoted) throw new Error('LGD CSV ends inside a quoted field');
  return rows;
}

function isoDate(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (match === null) throw new Error(`Invalid LGD date: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function cleanCode(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 || /^0+$/.test(cleaned) ? null : cleaned;
}

function localName(value: string): string | null {
  const cleaned = value.trim();
  // Most upstream "local" village names are duplicated Latin text. Only preserve an
  // actual Devanagari name; null is more honest than labelling English as Hindi.
  return /[\u0900-\u097f]/.test(cleaned) ? cleaned.slice(0, 128) : null;
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function newer(left: VillageRow, right: VillageRow): VillageRow {
  return left.updatedAt >= right.updatedAt ? left : right;
}

function parseSnapshot(raw: string): VillageRow[] {
  const csv = parseCsv(raw);
  const header = csv.shift();
  if (header?.[0] !== 'VillageCode' || header[4] !== 'SubdistrictCode') {
    throw new Error('LGD CSV columns do not match the reviewed snapshot schema');
  }

  const deduplicated = new Map<string, VillageRow>();
  for (const columns of csv) {
    if (columns.length === 1 && columns[0] === '') continue;
    if (columns.length !== 17) throw new Error(`LGD CSV row has ${columns.length} columns`);
    if (columns[12] !== '5' || columns[13] !== 'Uttarakhand') {
      throw new Error(`Non-Uttarakhand row found in snapshot: ${columns[13]}`);
    }

    const row: VillageRow = {
      villageCode: columns[0] ?? '',
      nameEn: (columns[1] ?? '').trim().slice(0, 128),
      nameHi: localName(columns[2] ?? ''),
      censusCode: cleanCode(columns[3] ?? ''),
      subdistrictCode: columns[4] ?? '',
      subdistrictName: (columns[5] ?? '').trim().slice(0, 128),
      subdistrictCensusCode: cleanCode(columns[7] ?? ''),
      districtCode: columns[8] ?? '',
      districtName: (columns[9] ?? '').trim(),
      districtCensusCode: cleanCode(columns[11] ?? ''),
      updatedAt: isoDate(columns[16] ?? ''),
    };
    if (
      row.villageCode.length === 0 ||
      row.nameEn.length === 0 ||
      row.subdistrictCode.length === 0 ||
      row.subdistrictName.length === 0
    ) {
      throw new Error(`Incomplete LGD row for village code ${row.villageCode || '(blank)'}`);
    }
    const previous = deduplicated.get(row.villageCode);
    deduplicated.set(row.villageCode, previous === undefined ? row : newer(previous, row));
  }

  const rows = [...deduplicated.values()];
  const districts = new Set(rows.map((row) => row.districtCode));
  const subdistricts = new Set(rows.map((row) => row.subdistrictCode));
  if (
    rows.length !== EXPECTED_UNIQUE_VILLAGES ||
    districts.size !== EXPECTED_DISTRICTS ||
    subdistricts.size !== EXPECTED_SUBDISTRICTS
  ) {
    throw new Error(
      `LGD snapshot invariant failed: ${rows.length} villages, ${districts.size} districts, ${subdistricts.size} sub-districts`,
    );
  }
  return rows;
}

const renamedTehsilAliases: Readonly<Record<string, string>> = {
  // Current LGD names on the left, the earlier state-directory names already in our stable
  // hierarchy on the right. Reusing the row preserves internal IDs and existing links.
  Barnigad: 'Barkot',
  Bhikiasain: 'Bhikiyasain',
  Chaukhutiya: 'Chaukhutia',
  Dhoomakot: 'Dhumakot',
  'Ganai Gangoli': 'Ganai',
  Garud: 'Garur',
  Ghaat: 'Ghat',
  Hardwar: 'Haridwar',
  Kafligair: 'Kaphaligair',
  'Kosya Kutauli': 'Kainchi Dham',
  Kotdwara: 'Kotdwar',
  Lamgada: 'Lamgara',
  Nainbag: 'Nainbagh',
  Nandprayag: 'Nandaprayag',
  Okhalkanda: 'Khansyun',
  Pawkidevi: 'Paoki Devi',
  Poornagiri: 'Purnagiri',
  Puraula: 'Purola',
  Sult: 'Salt',
  Thailisain: 'Thalisain',
};

async function upsertTehsils(client: PoolClient, rows: VillageRow[]): Promise<Map<string, number>> {
  const districtsResult = await client.query<DistrictRow>(
    `SELECT id, slug, name_en, division FROM areas WHERE type = 'district'`,
  );
  const districtByName = new Map(districtsResult.rows.map((row) => [row.name_en, row]));

  const officialDistricts = new Map<string, VillageRow>();
  const officialTehsils = new Map<string, VillageRow>();
  for (const row of rows) {
    officialDistricts.set(row.districtCode, row);
    officialTehsils.set(row.subdistrictCode, row);
  }

  for (const row of officialDistricts.values()) {
    const district = districtByName.get(row.districtName);
    if (district === undefined) throw new Error(`Unknown district in LGD: ${row.districtName}`);
    await client.query(`UPDATE areas SET lgd_code = $1, census_2011_code = $2 WHERE id = $3`, [
      row.districtCode,
      row.districtCensusCode,
      district.id,
    ]);
  }

  const current = await client.query<TehsilRow>(
    `SELECT t.id, t.code, t.slug, t.name_en, d.name_en AS district_name
       FROM areas t JOIN areas d ON d.id = t.parent_id
      WHERE t.type = 'tehsil' AND d.type = 'district'`,
  );
  const currentByName = new Map(
    current.rows.map((row) => [`${row.district_name}:${normalise(row.name_en)}`, row]),
  );
  const idByOfficialCode = new Map<string, number>();

  for (const official of officialTehsils.values()) {
    const district = districtByName.get(official.districtName);
    if (district === undefined) throw new Error(`Unknown district: ${official.districtName}`);
    const previousName = renamedTehsilAliases[official.subdistrictName];
    const aliasedExisting =
      previousName === undefined
        ? undefined
        : currentByName.get(`${official.districtName}:${normalise(previousName)}`);
    const exactExisting = currentByName.get(
      `${official.districtName}:${normalise(official.subdistrictName)}`,
    );
    const existing = aliasedExisting ?? exactExisting;

    if (existing !== undefined) {
      // Version 1 could have inserted an official-spelling duplicate before all historical
      // name variants were enumerated. With village children cleared, consolidate it back
      // into the stable pre-existing row rather than carrying two tehsils forever.
      if (
        aliasedExisting !== undefined &&
        exactExisting !== undefined &&
        exactExisting.id !== aliasedExisting.id
      ) {
        await client.query(`DELETE FROM areas WHERE id = $1 AND type = 'tehsil'`, [
          exactExisting.id,
        ]);
      }
      await client.query(
        `UPDATE areas
            SET name_en = $1, lgd_code = $2, census_2011_code = $3
          WHERE id = $4`,
        [
          official.subdistrictName,
          official.subdistrictCode,
          official.subdistrictCensusCode,
          existing.id,
        ],
      );
      idByOfficialCode.set(official.subdistrictCode, existing.id);
      continue;
    }

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO areas
         (type, code, slug, name_en, name_hi, parent_id, division, lgd_code, census_2011_code)
       VALUES ('tehsil', $1, $2, $3, NULL, $4, $5, $6, $7)
       ON CONFLICT (type, code) DO UPDATE SET
         name_en = EXCLUDED.name_en,
         parent_id = EXCLUDED.parent_id,
         division = EXCLUDED.division,
         lgd_code = EXCLUDED.lgd_code,
         census_2011_code = EXCLUDED.census_2011_code
       RETURNING id`,
      [
        `LGD-SD-${official.subdistrictCode}`,
        `${district.slug}-${slugify(official.subdistrictName)}-${official.subdistrictCode}`,
        official.subdistrictName,
        district.id,
        district.division,
        official.subdistrictCode,
        official.subdistrictCensusCode,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (id === undefined) throw new Error(`No id returned for ${official.subdistrictName}`);
    idByOfficialCode.set(official.subdistrictCode, id);
  }

  if (idByOfficialCode.size !== EXPECTED_SUBDISTRICTS) {
    throw new Error(`Only ${idByOfficialCode.size} official sub-districts resolved`);
  }
  return idByOfficialCode;
}

async function replaceVillages(
  client: PoolClient,
  rows: VillageRow[],
  tehsilIds: ReadonlyMap<string, number>,
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = chunk.map((row) => {
      const parentId = tehsilIds.get(row.subdistrictCode);
      if (parentId === undefined) throw new Error(`No tehsil for LGD ${row.subdistrictCode}`);
      return [
        'village',
        `LGD-V-${row.villageCode}`,
        `village-${row.villageCode}`,
        row.nameEn,
        row.nameHi,
        parentId,
        row.villageCode,
        row.censusCode,
      ];
    });
    const fragment = bulkValues(values);
    await client.query(
      `INSERT INTO areas
         (type, code, slug, name_en, name_hi, parent_id, lgd_code, census_2011_code)
       VALUES ${fragment.text}
       ON CONFLICT (type, code) DO UPDATE SET
         name_en = EXCLUDED.name_en,
         name_hi = EXCLUDED.name_hi,
         parent_id = EXCLUDED.parent_id,
         lgd_code = EXCLUDED.lgd_code,
         census_2011_code = EXCLUDED.census_2011_code`,
      fragment.params,
    );
  }
}

async function run(): Promise<void> {
  const raw = await readFile(SNAPSHOT, 'utf8');
  // Include the importer contract so a reconciliation fix reruns against an unchanged
  // government snapshot. The checkpoint means only code that changes data semantics bumps it.
  const sha256 = createHash('sha256').update(`${IMPORT_VERSION}\0${raw}`).digest('hex');
  const rows = parseSnapshot(raw);
  const vintage = rows.reduce(
    (latest, row) => (row.updatedAt > latest ? row.updatedAt : latest),
    '0000-00-00',
  );
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // A checksum check outside this lock is a check-then-write race: two new instances can
    // both decide to replace the hierarchy during a rolling deployment. Rechecking while a
    // transaction-scoped advisory lock is held makes the import single-writer and retry-safe.
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [IMPORT_ADVISORY_LOCK]);
    const alreadyImported = await client.query<{ snapshot_sha256: string }>(
      `SELECT snapshot_sha256 FROM reference_data_imports WHERE dataset_key = $1`,
      [DATASET_KEY],
    );
    if (alreadyImported.rows[0]?.snapshot_sha256 === sha256 && (await directoryIsHealthy(client))) {
      await client.query('COMMIT');
      logger.info('LGD village snapshot already imported and verified', { sha256 });
      return;
    }

    // Clear both the old OSM-derived hierarchy and a previous LGD snapshot before tehsil
    // reconciliation. This also makes it safe to merge duplicate legacy tehsil rows.
    await client.query(
      `DELETE FROM areas WHERE type = 'village' AND (code LIKE 'OSM-V-%' OR code LIKE 'LGD-V-%')`,
    );
    const tehsilIds = await upsertTehsils(client, rows);
    await replaceVillages(client, rows, tehsilIds);

    if (!(await directoryIsHealthy(client))) {
      throw new Error(
        'LGD directory reconciliation did not produce exactly 17,343 official villages and 129 official sub-districts',
      );
    }

    await client.query(
      `INSERT INTO reference_data_imports
         (dataset_key, snapshot_sha256, source_vintage, row_count, imported_at)
       VALUES ($1, $2, $3, $4, (now() AT TIME ZONE 'utc'))
       ON CONFLICT (dataset_key) DO UPDATE SET
         snapshot_sha256 = EXCLUDED.snapshot_sha256,
         source_vintage = EXCLUDED.source_vintage,
         row_count = EXCLUDED.row_count,
         imported_at = EXCLUDED.imported_at`,
      [DATASET_KEY, sha256, vintage, rows.length],
    );
    await client.query(
      `INSERT INTO ingestion_runs
         (source_id, started_at, finished_at, status, rows_written, rows_rejected,
          notes, vintage, triggered_by)
       VALUES (
         (SELECT id FROM sources WHERE source_key = $1),
         (now() AT TIME ZONE 'utc'), (now() AT TIME ZONE 'utc'), 'succeeded', $2, 4,
         $3, $4, 'deployment'
       )`,
      [
        DATASET_KEY,
        rows.length,
        'Imported checked-in LGD snapshot; four superseded duplicate-code rows excluded by newest update date.',
        vintage,
      ],
    );
    await client.query('COMMIT');
    logger.info('LGD village snapshot imported', {
      villages: rows.length,
      subdistricts: tehsilIds.size,
      vintage,
      sha256,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

run()
  .catch((error: unknown) => {
    logger.error('LGD village import failed', { error: describeError(error) });
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
