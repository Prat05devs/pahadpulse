import { describe, expect, it } from '@jest/globals';

import { buildIndex, findDistrict, normalise } from './districts.js';
import { match } from './matcher.js';
import { buildPlaceIndex } from './places.js';

const index = buildIndex([
  { slug: 'almora', name: { en: 'Almora', hi: 'अल्मोड़ा' } },
  { slug: 'chamoli', name: { en: 'Chamoli', hi: 'चमोली' } },
  { slug: 'dehradun', name: { en: 'Dehradun', hi: 'देहरादून' } },
  { slug: 'nainital', name: { en: 'Nainital', hi: 'नैनीताल' } },
  { slug: 'pauri-garhwal', name: { en: 'Pauri Garhwal', hi: 'पौड़ी गढ़वाल' } },
  { slug: 'rudraprayag', name: { en: 'Rudraprayag', hi: 'रुद्रप्रयाग' } },
  { slug: 'tehri-garhwal', name: { en: 'Tehri Garhwal', hi: 'टिहरी गढ़वाल' } },
  { slug: 'udham-singh-nagar', name: { en: 'Udham Singh Nagar', hi: 'ऊधम सिंह नगर' } },
]);

const places = buildPlaceIndex(index);

describe('findDistrict', () => {
  it.each([
    ['weather in almora', 'almora'],
    ['देहरादून में मौसम', 'dehradun'],
    ['is it raining in dehra dun', 'dehradun'],
    ['pauri garhwal population', 'pauri-garhwal'],
    ['going to kedarnath next week', 'rudraprayag'],
    ['roads near haldwani', 'nainital'],
    ['us nagar air quality', 'udham-singh-nagar'],
    ['पौड़ी गढ़वाल की जनसंख्या', 'pauri-garhwal'],
  ])('finds the district in "%s"', (text, slug) => {
    expect(findDistrict(index, normalise(text))?.district.slug).toBe(slug);
  });

  it('matches whole words only', () => {
    expect(findDistrict(index, normalise('I dunno about that'))).toBeNull();
  });

  it('treats a word with and without a nukta as the same', () => {
    expect(normalise('ज़िले')).toBe(normalise('जिले'));
  });
});

describe('match', () => {
  it.each([
    ['What is the weather in Almora?', 'weather.now', 'almora'],
    ['will it rain in chamoli', 'weather.rain', 'chamoli'],
    ['baarish dehradun', 'weather.rain', 'dehradun'],
    ['any forest fire in nainital', 'fires.district', 'nainital'],
    ['aag lagi hai kya pauri me', 'fires.district', 'pauri-garhwal'],
    ['air quality in dehradun', 'air.district', 'dehradun'],
    ['is it safe to travel to chamoli', 'travel.check', 'chamoli'],
    ['population of tehri', 'district.population', 'tehri-garhwal'],
    ['earthquake', 'quakes.recent', null],
    ['biggest earthquake', 'quakes.largest', null],
    ['भूकंप', 'quakes.recent', null],
    ['how many villages are there', 'state.villages', null],
    ['char dham pilgrims', 'tourism.chardham', null],
  ])('routes "%s" to %s', (text, questionId, district) => {
    const result = match(index, places, text);
    expect(result.outcome).toBe('matched');
    expect(result.questionId).toBe(questionId);
    expect(result.district?.slug ?? null).toBe(district);
  });

  it.each([
    ['weather at kedarnath', 'place.weather', 'kedarnath', 'rudraprayag'],
    ['is it safe to travel to kedarnath', 'place.travel', 'kedarnath', 'rudraprayag'],
    ['tell me about auli', 'place.about', 'auli', 'chamoli'],
    ['hemkunt sahib weather', 'place.weather', 'hemkund-sahib', 'chamoli'],
    ['फूलों की घाटी के बारे में बताइए', 'place.about', 'valley-of-flowers', 'chamoli'],
  ])('routes "%s" to %s for the place', (text, questionId, place, district) => {
    const result = match(index, places, text);
    expect(result).toMatchObject({ outcome: 'matched', questionId, needs: null });
    expect(result.place?.slug).toBe(place);
    expect(result.district?.slug).toBe(district);
  });

  /** A district's own name means the district, even when a guide place shares it. */
  it('reads "Nainital" as the district', () => {
    const result = match(index, places, 'weather in nainital');
    expect(result).toMatchObject({ questionId: 'weather.now', place: null });
    expect(result.district?.slug).toBe('nainital');
  });

  it.each([
    ['how does the comparison tool work', 'tools.compare'],
    ['what is the scheme finder', 'tools.schemes'],
    ['what is pahad pulse', 'about.what'],
    ['why is there no live traffic', 'about.scope'],
    ['is pahad pulse a government app', 'about.government'],
    ['where do the warnings come from', 'source.alerts'],
    ['how do I register for the yatra', 'tourism.register'],
    ['which pilgrim places are there besides char dham', 'tourism.pilgrimages'],
  ])('routes "%s" to %s', (text, questionId) => {
    expect(match(index, places, text)).toMatchObject({ outcome: 'matched', questionId });
  });

  it('asks for a district when a district question names none', () => {
    const result = match(index, places, 'is it safe to travel next week');
    expect(result.questionId).toBe('travel.check');
    expect(result.needs).toBe('district');
  });

  it('suggests rather than guesses when two questions fit equally', () => {
    const result = match(index, places, 'population');
    expect(result.outcome).toBe('suggest');
    expect(result.suggestions).toEqual(['district.population', 'state.population']);
  });

  it('answers nothing for text outside the catalogue (AST-5)', () => {
    const result = match(index, places, 'write me a poem about cricket');
    expect(result).toMatchObject({ outcome: 'none', questionId: null, suggestions: [] });
  });
});
