import { describe, expect, it } from '@jest/globals';

import type { DistrictName } from '../../../models/area.model.js';
import { matchRelationToDistrict, parseOverpassRelations } from './openstreetmap.parser.js';

const districts: DistrictName[] = [
  { id: 2, nameEn: 'Almora', nameHi: 'अल्मोड़ा' },
  { id: 7, nameEn: 'Haridwar', nameHi: 'हरिद्वार' },
  { id: 9, nameEn: 'Pauri Garhwal', nameHi: 'पौड़ी गढ़वाल' },
  { id: 10, nameEn: 'Pithoragarh', nameHi: 'पिथौरागढ़' },
  { id: 12, nameEn: 'Tehri Garhwal', nameHi: 'टिहरी गढ़वाल' },
];

/** The shape Overpass returns for `out geom` — verified against a real response. */
const overpassBody = JSON.stringify({
  elements: [
    {
      type: 'relation',
      id: 374938,
      tags: { name: 'Almora', admin_level: '5', boundary: 'administrative' },
      members: [
        {
          type: 'way',
          ref: 1,
          role: 'outer',
          geometry: [
            { lat: 29.5, lon: 79.6 },
            { lat: 29.6, lon: 79.7 },
          ],
        },
        {
          type: 'node',
          ref: 2,
          role: 'admin_centre',
        },
      ],
    },
  ],
});

describe('parseOverpassRelations', () => {
  it('reads relations and their outer ways', () => {
    const result = parseOverpassRelations(overpassBody);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.name).toBe('Almora');
    expect(result.value[0]?.ways).toHaveLength(1);
  });

  it('converts lat/lon into GeoJSON longitude-first order', () => {
    const result = parseOverpassRelations(overpassBody);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value[0]?.ways[0]?.[0]).toEqual([79.6, 29.5]);
  });

  it('ignores non-way members', () => {
    const result = parseOverpassRelations(overpassBody);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0]?.ways).toHaveLength(1);
  });

  it('skips inner ways so an enclave is not treated as the outline', () => {
    const result = parseOverpassRelations(
      JSON.stringify({
        elements: [
          {
            id: 1,
            tags: { name: 'Almora' },
            members: [
              {
                type: 'way',
                role: 'outer',
                geometry: [
                  { lat: 1, lon: 1 },
                  { lat: 2, lon: 2 },
                ],
              },
              {
                type: 'way',
                role: 'inner',
                geometry: [
                  { lat: 1.4, lon: 1.4 },
                  { lat: 1.5, lon: 1.5 },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0]?.ways).toHaveLength(1);
  });

  it('rejects the HTML error page a busy Overpass mirror returns', () => {
    // This is the actual detector the connector uses to fail over to the next mirror —
    // a busy mirror answers HTTP 200, so the status code cannot be trusted.
    expect(
      parseOverpassRelations('<html><body><p>Error: runtime error: too busy</p></body></html>')
        .isErr(),
    ).toBe(true);
  });

  it('rejects valid JSON with no usable relations', () => {
    expect(parseOverpassRelations(JSON.stringify({ elements: [] })).isErr()).toBe(true);
  });

  it('rejects a response with no elements array', () => {
    expect(parseOverpassRelations(JSON.stringify({ version: 0.6 })).isErr()).toBe(true);
  });
});

describe('matchRelationToDistrict', () => {
  it('matches an exact name', () => {
    expect(matchRelationToDistrict('Almora', districts)?.id).toBe(2);
  });

  it('strips the "district" suffix OSM adds to Pithoragarh', () => {
    expect(matchRelationToDistrict('Pithoragarh district', districts)?.id).toBe(10);
  });

  it('is case and whitespace insensitive', () => {
    expect(matchRelationToDistrict('  haridwar  ', districts)?.id).toBe(7);
  });

  it('matches a Hindi relation name', () => {
    expect(matchRelationToDistrict('टिहरी गढ़वाल', districts)?.id).toBe(12);
  });

  it('refuses an ambiguous partial rather than guessing', () => {
    // "Garhwal" is contained in both Pauri Garhwal and Tehri Garhwal. Guessing would put
    // one district's outline on the other, invisibly and permanently.
    expect(matchRelationToDistrict('Garhwal', districts)).toBeNull();
  });

  it('returns null for a name that matches nothing', () => {
    expect(matchRelationToDistrict('Shimla', districts)).toBeNull();
  });
});
