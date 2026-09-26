import { z } from 'zod';
import guideJson from '../data/tourism-guide.json' with { type: 'json' };
import type { TourismGuide } from '../models/tourism-guide.model.js';

const Url = z.url();
const BasePlace = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  district: z.string().min(1),
  image_url: Url,
  official_url: Url,
  map_destination: z.string().min(1),
  lat: z.number().min(28).max(32),
  lng: z.number().min(77).max(81),
});

const GuideSchema = z.object({
  verified_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: Url,
  char_dham: z
    .array(
      BasePlace.extend({
        name_hi: z.string().min(1),
        altitude_m: z.number().int().positive(),
        best_season: z.string().min(1),
        access: z.string().min(1),
        image_alt: z.string().min(1),
      }),
    )
    .length(4),
  pilgrimages: z.array(
    BasePlace.extend({ category: z.string().min(1), summary: z.string().min(1) }),
  ),
  destinations: z.array(
    BasePlace.extend({ category: z.string().min(1), summary: z.string().min(1) }),
  ),
  official_links: z.array(
    z.object({
      label: z.string().min(1),
      description: z.string().min(1),
      url: Url,
      kind: z.enum(['primary', 'guide', 'map']),
    }),
  ),
  guidelines: z.array(z.string().min(1)),
});

const guide = GuideSchema.parse(guideJson);

export function getTourismGuide(): TourismGuide {
  return {
    verifiedOn: guide.verified_on,
    sourceUrl: guide.source,
    charDham: guide.char_dham.map((place) => ({
      slug: place.slug,
      name: place.name,
      nameHi: place.name_hi,
      district: place.district,
      altitudeM: place.altitude_m,
      bestSeason: place.best_season,
      access: place.access,
      imageUrl: place.image_url,
      imageAlt: place.image_alt,
      officialUrl: place.official_url,
      mapDestination: place.map_destination,
      lat: place.lat,
      lng: place.lng,
    })),
    pilgrimages: guide.pilgrimages.map((place) => ({
      slug: place.slug,
      name: place.name,
      district: place.district,
      category: place.category,
      summary: place.summary,
      imageUrl: place.image_url,
      officialUrl: place.official_url,
      mapDestination: place.map_destination,
      lat: place.lat,
      lng: place.lng,
    })),
    destinations: guide.destinations.map((place) => ({
      slug: place.slug,
      name: place.name,
      district: place.district,
      category: place.category,
      summary: place.summary,
      imageUrl: place.image_url,
      officialUrl: place.official_url,
      mapDestination: place.map_destination,
      lat: place.lat,
      lng: place.lng,
    })),
    officialLinks: guide.official_links,
    guidelines: guide.guidelines,
    helplines: { yatra: ['1364', '0135-3520100'], emergency: '112' },
  };
}
