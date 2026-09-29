import { ok } from 'neverthrow';

import { getTourismGuide } from '../../tourism-guide.service.js';
import { normalise } from '../districts.js';
import { empty, formatCount, same, unavailable } from '../format.js';
import type { Fact, Localised, PlaceRef, Resolver, ResolvedFacts } from '../types.js';
import { travelCheck } from './travel.js';
import { weatherNow } from './weather.js';

/**
 * Answers from the official travel guide (data/tourism-guide.json). The guide's summaries
 * are published in English only and are quoted as written, the way an authority's alert
 * headline is (ALR-2), rather than translated here.
 */

function guideSource(url?: string): Fact['source'] {
  const guide = getTourismGuide();
  return {
    department: {
      en: 'Uttarakhand Tourism (official guide)',
      hi: 'उत्तराखंड पर्यटन (आधिकारिक गाइड)',
    },
    url: url ?? guide.sourceUrl,
  };
}

const KIND: Record<PlaceRef['kind'], Localised> = {
  char_dham: { en: 'one of the Char Dham shrines', hi: 'चारधाम में से एक' },
  pilgrimage: { en: 'a pilgrimage place', hi: 'एक तीर्थ स्थल' },
  destination: { en: 'a tourist destination', hi: 'एक पर्यटन स्थल' },
};

function districtName(place: PlaceRef): Localised {
  return place.district?.name ?? { en: 'Uttarakhand', hi: 'उत्तराखंड' };
}

export const placeAbout: Resolver = ({ place }) => {
  if (place === undefined) return Promise.resolve(ok(empty()));

  // The Char Dham carry altitude, season and access; other places a one-line summary.
  const details: Localised =
    place.kind === 'char_dham'
      ? {
          en: `It stands at about ${formatCount(place.altitudeM ?? 0)} m. Season: ${place.bestSeason ?? '—'}. Access: ${place.access ?? '—'}`,
          hi: `यह लगभग ${formatCount(place.altitudeM ?? 0)} मीटर की ऊँचाई पर है। मौसम: ${place.bestSeason ?? '—'}। पहुँच: ${place.access ?? '—'}`,
        }
      : same(place.summary ?? '');

  const facts: Fact[] = [
    {
      label: { en: 'Official page', hi: 'आधिकारिक पेज' },
      value: place.name.en,
      vintage: null,
      source: guideSource(place.officialUrl),
    },
  ];
  if (place.altitudeM !== null) {
    facts.unshift({
      label: { en: 'Altitude', hi: 'ऊँचाई' },
      value: `${formatCount(place.altitudeM)} m`,
      vintage: null,
      source: guideSource(place.officialUrl),
    });
  }

  return Promise.resolve(
    ok({
      status: 'ok',
      slots: { place: place.name, kind: KIND[place.kind], district: districtName(place), details },
      facts,
    }),
  );
};

/** A place question answered by a district resolver, reworded to name the place (§3.2). */
function viaDistrict(resolver: Resolver): Resolver {
  return async ({ place }, now) => {
    if (place === undefined) return ok(empty());
    if (place.district === null) return ok(unavailable('no_data', { place: place.name }));
    const result = await resolver({ district: place.district }, now);
    if (result.isErr()) return result;
    const withPlace: ResolvedFacts = {
      ...result.value,
      slots: { ...result.value.slots, place: place.name, district: place.district.name },
    };
    return ok(withPlace);
  };
}

export const placeWeather = viaDistrict(weatherNow);
export const placeTravel = viaDistrict(travelCheck);

function placesOf(kind: PlaceRef['kind']): Resolver {
  return () => {
    const guide = getTourismGuide();
    const source = guideSource();
    const places = (kind === 'pilgrimage' ? guide.pilgrimages : guide.destinations).map((p) => ({
      name: p.name,
      category: p.category,
      district: p.district,
    }));
    return Promise.resolve(
      ok({
        status: 'ok',
        slots: {
          count: formatCount(places.length),
          places: same(places.map((p) => `${p.name} (${p.category}, ${p.district})`).join('; ')),
        },
        facts: [
          {
            label: { en: 'Verified against', hi: 'इससे सत्यापित' },
            value: guide.sourceUrl,
            vintage: guide.verifiedOn,
            source,
          },
        ],
      }),
    );
  };
}

export const tourismPilgrimages = placesOf('pilgrimage');
export const tourismDestinations = placesOf('destination');

/** Every guide place (Char Dham, pilgrimage, destination) whose district is this one. */
export const tourismInDistrict: Resolver = ({ district }) => {
  if (district === undefined) return Promise.resolve(ok(empty()));
  const guide = getTourismGuide();
  const wanted = normalise(district.name.en);
  const here = [
    ...guide.charDham.map((p) => ({ name: p.name, category: 'Char Dham', district: p.district })),
    ...guide.pilgrimages,
    ...guide.destinations,
  ].filter((p) => normalise(p.district) === wanted);
  if (here.length === 0) return Promise.resolve(ok(empty({ district: district.name })));
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: {
        district: district.name,
        count: formatCount(here.length),
        places: same(here.map((p) => `${p.name} (${p.category})`).join('; ')),
      },
      facts: [],
    }),
  );
};

export const tourismSeason: Resolver = () => {
  const guide = getTourismGuide();
  const seasons = [...new Set(guide.charDham.map((p) => p.bestSeason))];
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: {
        season: same(
          seasons.length === 1
            ? (seasons[0] ?? '')
            : guide.charDham.map((p) => `${p.name}: ${p.bestSeason}`).join('; '),
        ),
      },
      facts: [
        {
          label: { en: 'Guide verified', hi: 'गाइड सत्यापित' },
          value: guide.sourceUrl,
          vintage: guide.verifiedOn,
          source: guideSource(),
        },
      ],
    }),
  );
};

export const tourismRegister: Resolver = () => {
  const primary = getTourismGuide().officialLinks.find((link) => link.kind === 'primary');
  if (primary === undefined) return Promise.resolve(ok(unavailable('no_data')));
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: { url: primary.url },
      facts: [
        {
          label: same(primary.label),
          value: primary.url,
          vintage: null,
          source: { department: same(primary.description), url: primary.url },
        },
      ],
    }),
  );
};

export const tourismGuidelines: Resolver = () => {
  const guide = getTourismGuide();
  if (guide.guidelines.length === 0) return Promise.resolve(ok(unavailable('no_data')));
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: { guidelines: same(guide.guidelines.slice(0, 5).join(' ')) },
      facts: [
        {
          label: { en: 'Official travel guide', hi: 'आधिकारिक यात्रा गाइड' },
          value: guide.sourceUrl,
          vintage: guide.verifiedOn,
          source: guideSource(),
        },
      ],
    }),
  );
};
