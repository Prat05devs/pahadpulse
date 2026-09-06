import { describe, expect, it } from '@jest/globals';

import { AqiBand, WeatherCondition } from '../types/hydromet.js';
import { classifyAqi, classifyWeatherCode, toCondition } from './observation.model.js';

describe('classifyAqi', () => {
  it('uses the US EPA breakpoints', () => {
    expect(classifyAqi(45)).toBe(AqiBand.Good);
    expect(classifyAqi(87)).toBe(AqiBand.Moderate);
    expect(classifyAqi(117)).toBe(AqiBand.UnhealthyForSensitive);
    expect(classifyAqi(175)).toBe(AqiBand.Unhealthy);
    expect(classifyAqi(250)).toBe(AqiBand.VeryUnhealthy);
    expect(classifyAqi(400)).toBe(AqiBand.Hazardous);
  });

  it('treats each breakpoint as the top of its band, not the bottom of the next', () => {
    expect(classifyAqi(50)).toBe(AqiBand.Good);
    expect(classifyAqi(51)).toBe(AqiBand.Moderate);
    expect(classifyAqi(100)).toBe(AqiBand.Moderate);
    expect(classifyAqi(101)).toBe(AqiBand.UnhealthyForSensitive);
    expect(classifyAqi(300)).toBe(AqiBand.VeryUnhealthy);
    expect(classifyAqi(301)).toBe(AqiBand.Hazardous);
  });

  it('bands the live Haridwar and Dehradun readings', () => {
    // 117 and 102 — both above 100, both "poor for sensitive groups" rather than merely
    // moderate. The boundary between those two bands is the one a reader acts on.
    expect(classifyAqi(117)).toBe(AqiBand.UnhealthyForSensitive);
    expect(classifyAqi(102)).toBe(AqiBand.UnhealthyForSensitive);
  });
});

describe('classifyWeatherCode', () => {
  it('maps the clear and cloudy codes', () => {
    expect(classifyWeatherCode(0)).toBe(WeatherCondition.Clear);
    expect(classifyWeatherCode(1)).toBe(WeatherCondition.PartlyCloudy);
    expect(classifyWeatherCode(2)).toBe(WeatherCondition.PartlyCloudy);
    expect(classifyWeatherCode(3)).toBe(WeatherCondition.Cloudy);
  });

  it('maps fog', () => {
    expect(classifyWeatherCode(45)).toBe(WeatherCondition.Fog);
    expect(classifyWeatherCode(48)).toBe(WeatherCondition.Fog);
  });

  it('separates drizzle from rain', () => {
    // 51 is what the live Dehradun fixture returned; drizzle is not rain.
    expect(classifyWeatherCode(51)).toBe(WeatherCondition.Drizzle);
    expect(classifyWeatherCode(57)).toBe(WeatherCondition.Drizzle);
    expect(classifyWeatherCode(61)).toBe(WeatherCondition.Rain);
  });

  it('separates heavy rain from rain, which matters in a monsoon state', () => {
    expect(classifyWeatherCode(63)).toBe(WeatherCondition.Rain);
    expect(classifyWeatherCode(65)).toBe(WeatherCondition.HeavyRain);
    expect(classifyWeatherCode(80)).toBe(WeatherCondition.Rain);
    expect(classifyWeatherCode(82)).toBe(WeatherCondition.HeavyRain);
  });

  it('maps snow, including snow showers', () => {
    expect(classifyWeatherCode(71)).toBe(WeatherCondition.Snow);
    expect(classifyWeatherCode(77)).toBe(WeatherCondition.Snow);
    expect(classifyWeatherCode(85)).toBe(WeatherCondition.Snow);
    expect(classifyWeatherCode(86)).toBe(WeatherCondition.Snow);
  });

  it('maps thunderstorms', () => {
    expect(classifyWeatherCode(95)).toBe(WeatherCondition.Thunderstorm);
    expect(classifyWeatherCode(99)).toBe(WeatherCondition.Thunderstorm);
  });

  it('returns unknown for a code outside the WMO table rather than guessing', () => {
    expect(classifyWeatherCode(7)).toBe(WeatherCondition.Unknown);
    expect(classifyWeatherCode(-1)).toBe(WeatherCondition.Unknown);
    expect(classifyWeatherCode(200)).toBe(WeatherCondition.Unknown);
  });
});

describe('toCondition', () => {
  it('keeps the raw code alongside the bucket', () => {
    const condition = toCondition(51);

    expect(condition.code).toBe(51);
    expect(condition.condition).toBe(WeatherCondition.Drizzle);
  });

  it('carries both languages, as every other user-facing string does', () => {
    const condition = toCondition(0);

    expect(condition.label.en).toBe('Clear');
    expect(condition.label.hi.length).toBeGreaterThan(0);
  });
});
