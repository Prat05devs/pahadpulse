import { describe, expect, it } from '@jest/globals';

import { IndicatorCategory } from '../types/indicator.js';
import { type ScoreInput, scoreIndicator, scoreTheme } from './comparison.service.js';

const base: Omit<ScoreInput, 'valuesBySlug'> = {
  indicatorKey: 'literacy_rate',
  label: 'Literacy rate',
  unit: 'percent',
  higherIsBetter: true,
  normalisation: 'none',
  vintage: '2011-03-01',
  sourceLabel: 'Census 2011',
};

describe('scoreIndicator', () => {
  const values = { dehradun: 84.3, nainital: 83.9, chamoli: 82.4, uttarkashi: 75.8 };

  it('places a district by position among the districts, not out of 100', () => {
    // The top district is 100 and the bottom 0 BY DEFINITION: the scale is a position in
    // the state, not a mark. A reader must not take 100 to mean "perfect literacy".
    expect(scoreIndicator({ ...base, valuesBySlug: values }, 'dehradun')?.score).toBe(100);
    expect(scoreIndicator({ ...base, valuesBySlug: values }, 'uttarkashi')?.score).toBe(0);
    const chamoli = scoreIndicator({ ...base, valuesBySlug: values }, 'chamoli');
    expect(chamoli?.score).toBeGreaterThan(0);
    expect(chamoli?.score).toBeLessThan(100);
  });

  it('ranks 1 as best and reports the field size', () => {
    const result = scoreIndicator({ ...base, valuesBySlug: values }, 'dehradun');
    expect(result?.rank).toBe(1);
    expect(result?.outOf).toBe(4);
  });

  it('inverts the scale when lower is better', () => {
    const lower = { ...base, higherIsBetter: false, valuesBySlug: values };
    expect(scoreIndicator(lower, 'uttarkashi')?.score).toBe(100);
    expect(scoreIndicator(lower, 'uttarkashi')?.rank).toBe(1);
  });

  it('refuses to score an indicator with no direction', () => {
    // The rule that keeps the platform honest. A district is not superior for being larger,
    // and there is no better sex ratio in this data model — so these are reported, never
    // ranked. Scoring them would manufacture a verdict out of a neutral fact.
    const noDirection = { ...base, higherIsBetter: null, valuesBySlug: values };
    expect(scoreIndicator(noDirection, 'dehradun')).toBeNull();
  });

  it('gives every district 50 when they are identical, rather than dividing by zero', () => {
    const flat = { ...base, valuesBySlug: { a: 70, b: 70, c: 70 } };
    expect(scoreIndicator(flat, 'a')?.score).toBe(50);
    expect(scoreIndicator(flat, 'b')?.score).toBe(50);
  });

  it('normalises counts, so a big district does not win on size alone', () => {
    // The failure this prevents: Haridwar has more schools than Rudraprayag mostly because
    // it has more people. Ranking the raw count measures population wearing the label
    // "education". Per 1,000 people, the smaller district is ahead.
    const counts: ScoreInput = {
      ...base,
      indicatorKey: 'schools_count',
      label: 'Schools',
      unit: 'count',
      normalisation: 'per_1000_people',
      valuesBySlug: { haridwar: 2000, rudraprayag: 400 },
      populationBySlug: { haridwar: 1_890_000, rudraprayag: 242_000 },
    };

    const haridwar = scoreIndicator(counts, 'haridwar');
    const rudraprayag = scoreIndicator(counts, 'rudraprayag');

    expect(haridwar?.rawValue).toBe(2000);
    expect(rudraprayag?.score).toBeGreaterThan(haridwar?.score ?? 0);
    expect(rudraprayag?.rank).toBe(1);
  });

  it('refuses to normalise without a population rather than falling back to the raw count', () => {
    const counts: ScoreInput = {
      ...base,
      normalisation: 'per_capita',
      valuesBySlug: { a: 100, b: 200 },
      populationBySlug: { a: 1000 },
    };
    // `b` has no population, so it cannot be normalised and drops out — leaving too few
    // districts to place `a` against, which is itself refused rather than guessed.
    expect(scoreIndicator(counts, 'b')).toBeNull();
    expect(scoreIndicator(counts, 'a')).toBeNull();
  });

  it('returns null for a district that has no value', () => {
    expect(scoreIndicator({ ...base, valuesBySlug: values }, 'haridwar')).toBeNull();
  });
});

describe('scoreTheme', () => {
  const literacy: ScoreInput = {
    ...base,
    valuesBySlug: { dehradun: 84.3, uttarkashi: 75.8, chamoli: 82.4 },
  };
  const income: ScoreInput = {
    ...base,
    indicatorKey: 'per_capita_income',
    label: 'Per capita income',
    unit: 'inr',
    valuesBySlug: { dehradun: 235707, uttarkashi: 120000, chamoli: 150000 },
  };

  it('averages the indicator positions and says how many it used', () => {
    const theme = scoreTheme(IndicatorCategory.Demography, [literacy, income], 'dehradun');
    expect(theme.score).toBe(100);
    expect(theme.basedOn).toBe(2);
    expect(theme.indicators).toHaveLength(2);
  });

  it('returns null, never zero, when nothing can be scored', () => {
    // Zero is a real position — the bottom of the state. "We have no data" is not that, and
    // rendering it as 0 would tell a reader the district is worst when nothing is known.
    const theme = scoreTheme(IndicatorCategory.Health, [], 'dehradun');
    expect(theme.score).toBeNull();
    expect(theme.basedOn).toBe(0);
  });

  it('reports basedOn = 1 when a theme rests on a single indicator', () => {
    // Not an error, but the UI has to be able to say the score IS that one indicator
    // rather than a rounded view of the theme.
    const theme = scoreTheme(IndicatorCategory.Economy, [income], 'chamoli');
    expect(theme.basedOn).toBe(1);
    expect(theme.score).toBe(theme.indicators[0]?.score);
  });

  it('ignores directionless indicators inside a theme', () => {
    const sexRatio: ScoreInput = {
      ...base,
      indicatorKey: 'sex_ratio',
      higherIsBetter: null,
      valuesBySlug: { dehradun: 902, uttarkashi: 958, chamoli: 1019 },
    };
    const theme = scoreTheme(IndicatorCategory.Demography, [literacy, sexRatio], 'dehradun');
    expect(theme.basedOn).toBe(1);
    expect(theme.indicators.map((entry) => entry.indicatorKey)).toEqual(['literacy_rate']);
  });
});
