import { getTourismGuide } from '../tourism-guide.service.js';
import { normalise, type DistrictIndex } from './districts.js';
import type { DistrictRef, PlaceKind, PlaceRef } from './types.js';

/**
 * The places the assistant can answer about: the official travel guide's Char Dham,
 * pilgrimages and destinations (data/tourism-guide.json, verified against
 * uttarakhandtourism.gov.in). Nothing is added here that the guide does not list.
 */

/** Other spellings people type, beyond the guide's own name and slug. Lower case. */
const ALIASES: Record<string, readonly string[]> = {
  badrinath: ['badri', 'badrinath dham', 'बद्री'],
  kedarnath: ['kedar', 'kedarnath dham', 'केदार'],
  gangotri: ['gangotri dham'],
  yamunotri: ['yamunotri dham', 'jamunotri'],
  'hemkund-sahib': ['hemkund', 'hemkunt', 'hemkunt sahib', 'हेमकुंड'],
  'valley-of-flowers': ['phoolon ki ghati', 'फूलों की घाटी'],
  'corbett-national-park': ['corbett', 'jim corbett', 'कॉर्बेट'],
  'har-ki-pauri': ['har ki paudi', 'हर की पौड़ी'],
  'kainchi-dham': ['kainchi', 'neem karoli', 'कैंची धाम'],
  'neelkanth-mahadev': ['neelkanth', 'nilkanth', 'नीलकंठ'],
  auli: ['औली'],
  chopta: ['चोपता'],
  mussoorie: ['masoori', 'मसूरी'],
  rishikesh: ['ऋषिकेश'],
  tungnath: ['तुंगनाथ'],
};

export interface PlaceIndex {
  places: PlaceRef[];
  names: Array<{ name: string; slug: string }>;
}

function districtFor(districts: DistrictIndex, name: string): DistrictRef | null {
  const wanted = normalise(name);
  return districts.districts.find((d) => normalise(d.name.en) === wanted) ?? null;
}

export function buildPlaceIndex(districts: DistrictIndex): PlaceIndex {
  const guide = getTourismGuide();
  const entry = (
    kind: PlaceKind,
    place: { slug: string; name: string; district: string },
    extra: Partial<PlaceRef>,
  ): PlaceRef => ({
    slug: place.slug,
    name: { en: place.name, hi: extra.name?.hi ?? place.name },
    kind,
    category: extra.category ?? null,
    district: districtFor(districts, place.district),
    summary: extra.summary ?? null,
    altitudeM: extra.altitudeM ?? null,
    bestSeason: extra.bestSeason ?? null,
    access: extra.access ?? null,
    officialUrl: extra.officialUrl ?? guide.sourceUrl,
  });

  const places: PlaceRef[] = [
    ...guide.charDham.map((p) =>
      entry('char_dham', p, {
        name: { en: p.name, hi: p.nameHi },
        altitudeM: p.altitudeM,
        bestSeason: p.bestSeason,
        access: p.access,
        officialUrl: p.officialUrl,
      }),
    ),
    ...guide.pilgrimages.map((p) =>
      entry('pilgrimage', p, {
        category: p.category,
        summary: p.summary,
        officialUrl: p.officialUrl,
      }),
    ),
    ...guide.destinations.map((p) =>
      entry('destination', p, {
        category: p.category,
        summary: p.summary,
        officialUrl: p.officialUrl,
      }),
    ),
  ];

  const names: Array<{ name: string; slug: string }> = [];
  for (const place of places) {
    for (const variant of [
      place.name.en,
      place.name.hi,
      place.slug.replace(/-/g, ' '),
      ...(ALIASES[place.slug] ?? []),
    ]) {
      const name = normalise(variant);
      if (name !== '' && !names.some((n) => n.name === name))
        names.push({ name, slug: place.slug });
    }
  }
  names.sort((a, b) => b.name.length - a.name.length);
  return { places, names };
}

export function findPlace(
  index: PlaceIndex,
  normalisedText: string,
): { place: PlaceRef; matched: string } | null {
  const padded = ` ${normalisedText} `;
  for (const { name, slug } of index.names) {
    if (padded.includes(` ${name} `)) {
      const place = index.places.find((p) => p.slug === slug);
      if (place !== undefined) return { place, matched: name };
    }
  }
  return null;
}
