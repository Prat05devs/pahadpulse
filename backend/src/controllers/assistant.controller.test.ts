import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import { ERRORS } from '../utils/errors.js';

/**
 * End to end through the assistant, with every data controller mocked. What these prove: a
 * real answer comes out with every slot filled, unavailable sources read as unavailable
 * (never zero), and bad input gets the 97xxx codes.
 */

const areas = {
  listDistricts: jest.fn(),
  getDistrictDetail: jest.fn(),
};
const alerts = {
  getSummary: jest.fn(),
  listActive: jest.fn(),
  listActiveForArea: jest.fn(),
  listRecent: jest.fn(),
};
const map = { getFireFeatures: jest.fn() };
const roads = { listRoadClosures: jest.fn() };
const observations = {
  getAreaWeather: jest.fn(),
  getAreaAirQuality: jest.fn(),
  getAllDistrictAirQuality: jest.fn(),
  forecastDateKey: (iso: string) => iso.slice(0, 10),
};
const indicators = { getAreaIndicators: jest.fn(), getRanking: jest.fn() };

jest.unstable_mockModule('./area.controller.js', () => areas);
jest.unstable_mockModule('./alert.controller.js', () => alerts);
jest.unstable_mockModule('./map.controller.js', () => map);
jest.unstable_mockModule('./road.controller.js', () => roads);
jest.unstable_mockModule('./observation.controller.js', () => observations);
jest.unstable_mockModule('./indicator.controller.js', () => indicators);

const { answer, clearAnswerCache, matchText } = await import('./assistant.controller.js');
const { resetIndex } = await import('../services/assistant/districts.js');

const NOW = new Date('2026-09-29T06:00:00Z');

const provenance = {
  sourceKey: 'census',
  department: { en: 'Office of the Registrar General', hi: 'महापंजीयक कार्यालय' },
  url: 'https://censusindia.gov.in',
  attribution: 'Census of India',
  vintage: '2026-03-01',
  fetchedAt: '2026-09-01 00:00:00',
  freshness: 'fresh',
  mayRedistribute: true,
};

function fire(district: string, name: string) {
  return {
    type: 'Feature',
    id: 1,
    geometry: { type: 'Point', coordinates: [79, 29.6] },
    properties: {
      detectionId: 1,
      acquiredAt: '2026-09-29T04:40:00.000Z',
      confidence: 'high',
      frpMw: 12,
      satellite: 'N20',
      instrument: 'VIIRS',
      dayNight: 'D',
      districtSlug: district,
      districtNameEn: name,
      districtNameHi: 'अल्मोड़ा',
    },
  };
}

beforeEach(() => {
  for (const group of [areas, alerts, map, roads, indicators]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  observations.getAreaWeather.mockReset();
  clearAnswerCache();
  resetIndex();

  areas.listDistricts.mockResolvedValue(
    ok([
      { slug: 'almora', name: { en: 'Almora', hi: 'अल्मोड़ा' } },
      { slug: 'chamoli', name: { en: 'Chamoli', hi: 'चमोली' } },
    ]) as never,
  );
  alerts.listActiveForArea.mockResolvedValue(ok({ data: [], pagination: {} }) as never);
  map.getFireFeatures.mockResolvedValue(
    ok({
      type: 'FeatureCollection',
      features: [fire('almora', 'Almora'), fire('almora', 'Almora')],
      attribution: [],
    }) as never,
  );
  roads.listRoadClosures.mockResolvedValue(
    ok({
      available: false,
      unavailableReason: 'not_permitted',
      checkedAt: null,
      closures: [],
      recentlyReopened: [],
      source: { department: 'PWD', url: 'https://mis.pwduk.in', attribution: 'PWD' },
    }) as never,
  );
  observations.getAreaWeather.mockResolvedValue(err(ERRORS.OBSERVATION_NOT_AVAILABLE) as never);
});

describe('answer: validation', () => {
  it('rejects a question outside the catalogue', async () => {
    const result = await answer({ questionId: 'poem.cricket', lang: 'en' }, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(97001);
  });

  it('requires a district for a district question', async () => {
    const result = await answer({ questionId: 'weather.now', lang: 'en' }, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(97002);
  });

  it('rejects a slug that is not a district', async () => {
    const result = await answer({ questionId: 'weather.now', district: 'goa', lang: 'en' }, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(97003);
  });
});

describe('answer: composed answers', () => {
  it('fills every slot of a fire answer and keeps the ground-truth caveat', async () => {
    const result = (
      await answer({ questionId: 'fires.district', district: 'almora', lang: 'en' }, NOW)
    )._unsafeUnwrap();

    expect(result.status).toBe('ok');
    expect(result.text).toContain('2 heat signatures in Almora');
    expect(result.text).toContain('not confirmed on the ground');
    expect(result.text).not.toMatch(/[{}]/);
    expect(result.facts[0]).toMatchObject({ value: '2', source: { department: 'NASA FIRMS' } });
  });

  it('writes the district in Hindi for a Hindi reader', async () => {
    const result = (
      await answer({ questionId: 'fires.district', district: 'almora', lang: 'hi' }, NOW)
    )._unsafeUnwrap();
    expect(result.text).toContain('अल्मोड़ा');
    expect(result.district).toEqual({ slug: 'almora', name: 'अल्मोड़ा' });
  });

  /** RD-1 / AST-3: a list we may not show is never "no closures". */
  it('says road data is not shown yet, and gives the helpline from the travel guide', async () => {
    const result = (await answer({ questionId: 'roads.closed', lang: 'en' }, NOW))._unsafeUnwrap();

    expect(result.status).toBe('unavailable');
    expect(result.text).toContain("isn't shown in Pahad Pulse yet");
    expect(result.text).toContain('1364');
    expect(result.text).not.toMatch(/no road closures/i);
    expect(result.facts).toEqual([]);
  });

  it('turns a missing reading into an honest unavailable answer, not zero', async () => {
    const result = (
      await answer({ questionId: 'weather.now', district: 'chamoli', lang: 'en' }, NOW)
    )._unsafeUnwrap();
    expect(result.status).toBe('unavailable');
    expect(result.text).toBe("There's no published figure for this yet.");
  });

  it('answers an empty result as a real answer', async () => {
    const result = (
      await answer({ questionId: 'alerts.district', district: 'chamoli', lang: 'en' }, NOW)
    )._unsafeUnwrap();
    expect(result.status).toBe('empty');
    expect(result.text).toBe('There are no active warnings for Chamoli right now.');
  });

  it('cites the source of a state figure', async () => {
    indicators.getAreaIndicators.mockResolvedValue(
      ok({
        values: [
          {
            indicator: {
              key: 'state_population_projection',
              label: { en: 'Projected population', hi: 'अनुमानित जनसंख्या' },
              unit: 'persons',
              decimals: 0,
            },
            value: 11_700_000,
            vintage: '2026-03-01',
            provenance,
          },
        ],
        pending: [],
      }) as never,
    );
    const result = (
      await answer({ questionId: 'state.population', lang: 'en' }, NOW)
    )._unsafeUnwrap();

    expect(result.text).toContain('1,17,00,000 (2026)');
    expect(result.facts[0]?.source).toEqual({
      department: 'Office of the Registrar General',
      url: 'https://censusindia.gov.in',
    });
  });

  /** AST-4: a list of signals, never a verdict. */
  it('builds the travel check from every signal without judging the trip', async () => {
    const result = (
      await answer({ questionId: 'travel.check', district: 'almora', lang: 'en' }, NOW)
    )._unsafeUnwrap();

    expect(result.text).toContain('Warnings: none active');
    expect(result.text).toContain('Weather: not available');
    expect(result.text).toContain('Satellite fire detections: 2 in the last 48 hours');
    expect(result.text).toContain('Roads: not shown in the app yet');
    expect(result.text).not.toMatch(/[{}]/);
    expect(result.text).not.toMatch(/\b(is safe|is unsafe|should not travel)\b/i);
  });

  it('carries the district into follow-ups that take one', async () => {
    const result = (
      await answer({ questionId: 'alerts.district', district: 'almora', lang: 'en' }, NOW)
    )._unsafeUnwrap();
    expect(result.followUps).toContainEqual({
      questionId: 'weather.now',
      district: 'almora',
      place: null,
      text: "What's the weather in Almora right now?",
    });
  });

  it('reuses a composed answer within its cache window', async () => {
    await answer({ questionId: 'fires.state', lang: 'en' }, NOW);
    await answer({ questionId: 'fires.state', lang: 'en' }, new Date(NOW.getTime() + 30_000));
    expect(map.getFireFeatures).toHaveBeenCalledTimes(1);
  });

  it('lets a database failure surface as an error rather than a made-up answer', async () => {
    map.getFireFeatures.mockResolvedValue(err(ERRORS.DATABASE_ERROR) as never);
    const result = await answer({ questionId: 'fires.state', lang: 'en' }, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.DATABASE_ERROR.code);
  });
});

describe('answer: places, tools and the product', () => {
  it('describes a Char Dham shrine from the official guide, with its district', async () => {
    areas.listDistricts.mockResolvedValue(
      ok([{ slug: 'rudraprayag', name: { en: 'Rudraprayag', hi: 'रुद्रप्रयाग' } }]) as never,
    );
    const result = (
      await answer({ questionId: 'place.about', place: 'kedarnath', lang: 'en' }, NOW)
    )._unsafeUnwrap();

    expect(result.text).toMatch(
      /^Kedarnath is one of the Char Dham shrines in Rudraprayag district\./,
    );
    expect(result.place).toEqual({ slug: 'kedarnath', name: 'Kedarnath' });
    expect(result.facts.some((f) => f.source?.url?.includes('uttarakhandtourism'))).toBe(true);
    // A district follow-up after a place question uses the place's district.
    expect(result.followUps).toContainEqual(
      expect.objectContaining({ questionId: 'tourism.district', district: 'rudraprayag' }),
    );
  });

  it('rejects a place that is not in the guide', async () => {
    const result = await answer({ questionId: 'place.about', place: 'goa-beach', lang: 'en' }, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(97004);
  });

  it('counts the scheme directory live rather than quoting a fixed number', async () => {
    const result = (await answer({ questionId: 'tools.schemes', lang: 'en' }, NOW))._unsafeUnwrap();
    expect(result.text).toMatch(/lists \d+ verified finance/);
    expect(result.text).not.toMatch(/[{}]/);
  });
});

describe('matchText', () => {
  it('returns the matched question and district', async () => {
    const result = (await matchText({ text: 'aag almora', lang: 'en' }, NOW))._unsafeUnwrap();
    expect(result).toMatchObject({
      outcome: 'matched',
      questionId: 'fires.district',
      district: 'almora',
      needs: null,
    });
  });

  it('fills the district into suggestion text when one was named', async () => {
    const result = (
      await matchText({ text: 'chamoli population', lang: 'en' }, NOW)
    )._unsafeUnwrap();
    expect(result.suggestions[0]?.text).toBe('What is the population of Chamoli?');
  });
});
