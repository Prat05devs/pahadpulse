import { err, ok, type Result } from 'neverthrow';

import * as areaController from '../../controllers/area.controller.js';
import type { RequestError } from '../../utils/errors.js';
import type { DistrictRef } from './types.js';

export const STATE_SLUG = 'uttarakhand';

/**
 * Other ways people write a district, beyond its English and Hindi names from `areas`.
 * Old names, short forms, spaced or romanised spellings. Keyed by slug; lower case. A name
 * that is also a town (Nainital, Almora) resolves to its district, which is what a question
 * about the weather "in Nainital" means here.
 */
const ALIASES: Record<string, readonly string[]> = {
  almora: ['almorah'],
  bageshwar: ['bageswar', 'bagesar'],
  chamoli: ['gopeshwar', 'joshimath', 'jyotirmath', 'badrinath'],
  champawat: ['champavat', 'tanakpur'],
  dehradun: ['dehra dun', 'dehra', 'doon', 'dun', 'mussoorie', 'rishikesh'],
  haridwar: ['hardwar', 'roorkee'],
  nainital: ['naini tal', 'haldwani', 'bhimtal'],
  'pauri-garhwal': ['pauri', 'garhwal pauri', 'kotdwar', 'lansdowne'],
  pithoragarh: ['pithora garh', 'munsiyari', 'dharchula'],
  rudraprayag: ['rudra prayag', 'kedarnath', 'guptkashi'],
  'tehri-garhwal': ['tehri', 'new tehri', 'garhwal tehri'],
  'udham-singh-nagar': ['udham singh nagar', 'us nagar', 'usnagar', 'rudrapur', 'kashipur'],
  uttarkashi: ['uttar kashi', 'gangotri', 'yamunotri', 'barkot'],
};

export interface DistrictIndex {
  districts: DistrictRef[];
  /** Normalised name or alias → slug, longest names first for matching. */
  names: Array<{ name: string; slug: string }>;
}

export function normalise(text: string): string {
  return (
    text
      .normalize('NFC')
      .toLowerCase()
      // Nukta dropped: readers type जिले and ज़िले interchangeably.
      .replace(/\u093C/g, '')
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function buildIndex(districts: DistrictRef[]): DistrictIndex {
  const names: Array<{ name: string; slug: string }> = [];
  for (const district of districts) {
    const variants = [
      district.name.en,
      district.name.hi,
      district.slug.replace(/-/g, ' '),
      ...(ALIASES[district.slug] ?? []),
    ];
    for (const variant of variants) {
      const name = normalise(variant);
      if (name !== '') names.push({ name, slug: district.slug });
    }
  }
  names.sort((a, b) => b.name.length - a.name.length);
  return { districts, names };
}

/** The district list is reference data: read once per process, refreshed daily. */
const INDEX_TTL_MS = 24 * 60 * 60 * 1000;
let cached: { index: DistrictIndex; expiresAt: number } | null = null;

export async function loadIndex(
  now: Date = new Date(),
): Promise<Result<DistrictIndex, RequestError>> {
  if (cached !== null && cached.expiresAt > now.getTime()) return ok(cached.index);
  const districts = await areaController.listDistricts();
  if (districts.isErr()) return err(districts.error);
  const index = buildIndex(
    districts.value.map((d) => ({ slug: d.slug, name: { en: d.name.en, hi: d.name.hi } })),
  );
  cached = { index, expiresAt: now.getTime() + INDEX_TTL_MS };
  return ok(index);
}

/** Test seam only. */
export function resetIndex(): void {
  cached = null;
}

/**
 * The first district named in the text, by longest match on whole words, so "pauri garhwal"
 * wins over "garhwal" and "dun" never matches inside "dunno".
 */
export function findDistrict(
  index: DistrictIndex,
  normalisedText: string,
): { district: DistrictRef; matched: string } | null {
  const padded = ` ${normalisedText} `;
  for (const { name, slug } of index.names) {
    if (padded.includes(` ${name} `)) {
      const district = index.districts.find((d) => d.slug === slug);
      if (district !== undefined) return { district, matched: name };
    }
  }
  return null;
}
