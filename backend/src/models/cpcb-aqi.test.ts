import { describe, expect, it } from '@jest/globals';

import { Metric } from '../types/hydromet.js';
import {
  NationalAqiBand,
  classifyNationalAqi,
  computeNationalAqi,
  subIndex,
  withAdequateCoverage,
} from './cpcb-aqi.js';

describe('subIndex', () => {
  it('returns the band boundary exactly at a breakpoint', () => {
    // PM2.5 30 µg/m³ is the top of CPCB's "Good" band, which ends at 50.
    expect(subIndex(Metric.Pm25, 30)).toBe(50);
    // Top of "Satisfactory".
    expect(subIndex(Metric.Pm25, 60)).toBe(100);
    // Top of "Moderate".
    expect(subIndex(Metric.Pm25, 90)).toBe(200);
  });

  it('interpolates linearly inside a band', () => {
    // PM2.5 75 µg/m³ sits inside the 61-90 band (index 101-200).
    expect(subIndex(Metric.Pm25, 75)).toBe(149);
    // PM10 175 reproduces CPCB's own worked figure of 150 — the check that the tabulated
    // inclusive bounds, rather than contiguous ones, are being used.
    expect(subIndex(Metric.Pm10, 175)).toBe(150);
  });

  it('converts CO from µg/m³ to the mg/m³ the standard uses', () => {
    // 1 mg/m³ = 1000 µg/m³, the top of CO's "Good" band.
    expect(subIndex(Metric.CarbonMonoxide, 1000)).toBe(50);
    // Without the conversion 1000 would land in the open-ended top band and read 500.
    expect(subIndex(Metric.CarbonMonoxide, 1000)).not.toBe(500);
    expect(subIndex(Metric.CarbonMonoxide, 2000)).toBe(100);
  });

  it('caps the open-ended top band at 500 rather than extrapolating', () => {
    // CPCB's scale stops at 500; a larger number would not be a defined index value.
    expect(subIndex(Metric.Pm25, 1_000)).toBe(500);
    expect(subIndex(Metric.Pm10, 5_000)).toBe(500);
  });

  it('rejects values the index is not defined for', () => {
    expect(subIndex(Metric.Pm25, -1)).toBeNull();
    expect(subIndex(Metric.Pm25, Number.NaN)).toBeNull();
    // Not a CPCB pollutant.
    expect(subIndex(Metric.TemperatureC, 20)).toBeNull();
  });
});

describe('classifyNationalAqi', () => {
  it('uses CPCB bands, which differ from the US EPA ones', () => {
    expect(classifyNationalAqi(50)).toBe(NationalAqiBand.Good);
    expect(classifyNationalAqi(51)).toBe(NationalAqiBand.Satisfactory);
    expect(classifyNationalAqi(100)).toBe(NationalAqiBand.Satisfactory);
    expect(classifyNationalAqi(101)).toBe(NationalAqiBand.Moderate);
    expect(classifyNationalAqi(200)).toBe(NationalAqiBand.Moderate);
    expect(classifyNationalAqi(201)).toBe(NationalAqiBand.Poor);
    expect(classifyNationalAqi(300)).toBe(NationalAqiBand.Poor);
    expect(classifyNationalAqi(301)).toBe(NationalAqiBand.VeryPoor);
    expect(classifyNationalAqi(401)).toBe(NationalAqiBand.Severe);
  });

  it('differs from the US scale at the levels common in north India', () => {
    // The reason this module exists. 90 on the CPCB scale is "Satisfactory"; the US EPA
    // scale calls the same index value "Moderate". Same air, different public message.
    expect(classifyNationalAqi(90)).toBe(NationalAqiBand.Satisfactory);
  });
});

describe('computeNationalAqi', () => {
  const full = {
    [Metric.Pm25]: 75, // -> 149
    [Metric.Pm10]: 120, // -> 114
    [Metric.NitrogenDioxide]: 40, // -> 50
    [Metric.Ozone]: 50, // -> 50
    [Metric.SulphurDioxide]: 40, // -> 50
    [Metric.CarbonMonoxide]: 1000, // -> 50
  };

  it('takes the maximum sub-index, not the average', () => {
    const result = computeNationalAqi(full);
    expect(result).not.toBeNull();
    expect(result?.value).toBe(149);
    expect(result?.dominantPollutant).toBe(Metric.Pm25);
    expect(result?.band).toBe(NationalAqiBand.Moderate);
  });

  it('reports every pollutant that contributed, worst first', () => {
    const result = computeNationalAqi(full);
    expect(result?.pollutantsUsed).toHaveLength(6);
    expect(result?.pollutantsUsed[0]?.metric).toBe(Metric.Pm25);
    const indices = result?.pollutantsUsed.map((p) => p.subIndex) ?? [];
    expect(indices).toEqual([...indices].sort((a, b) => b - a));
  });

  it('records the averaging window each pollutant is defined over', () => {
    const result = computeNationalAqi(full);
    const byMetric = new Map(result?.pollutantsUsed.map((p) => [p.metric, p.averagingHours]));
    expect(byMetric.get(Metric.Pm25)).toBe(24);
    expect(byMetric.get(Metric.CarbonMonoxide)).toBe(8);
    expect(byMetric.get(Metric.Ozone)).toBe(8);
  });

  it('returns null below CPCB\'s three-pollutant minimum', () => {
    expect(computeNationalAqi({ [Metric.Pm25]: 75 })).toBeNull();
    expect(computeNationalAqi({ [Metric.Pm25]: 75, [Metric.Pm10]: 120 })).toBeNull();
  });

  it('returns null when neither PM2.5 nor PM10 is present', () => {
    // Three pollutants, but no particulate — CPCB does not define an index for this.
    expect(
      computeNationalAqi({
        [Metric.NitrogenDioxide]: 40,
        [Metric.Ozone]: 50,
        [Metric.SulphurDioxide]: 40,
      }),
    ).toBeNull();
  });

  it('computes from exactly three pollutants when one is particulate', () => {
    const result = computeNationalAqi({
      [Metric.Pm10]: 175,
      [Metric.NitrogenDioxide]: 40,
      [Metric.Ozone]: 50,
    });
    expect(result?.value).toBe(150);
    expect(result?.dominantPollutant).toBe(Metric.Pm10);
  });

  it('cannot overstate the air, since the missing NH3 and Pb could only raise a maximum', () => {
    // Documents the known shortfall as behaviour: the result is a floor.
    const withParticulateOnly = computeNationalAqi({
      [Metric.Pm25]: 30,
      [Metric.Pm10]: 50,
      [Metric.NitrogenDioxide]: 40,
    });
    expect(withParticulateOnly?.value).toBe(50);
    expect(withParticulateOnly?.band).toBe(NationalAqiBand.Good);
  });
});

describe('withAdequateCoverage', () => {
  it('drops a window that has too few readings to be an average', () => {
    // The state the data was actually in before the connector stored an hourly series: one
    // reading, which would otherwise have been published as a 24-hour mean.
    const eligible = withAdequateCoverage([
      { metric: Metric.Pm25, average: 75, sampleCount: 1 },
      { metric: Metric.Pm10, average: 120, sampleCount: 1 },
      { metric: Metric.Ozone, average: 50, sampleCount: 1 },
    ]);
    expect(Object.keys(eligible)).toHaveLength(0);
    expect(computeNationalAqi(eligible)).toBeNull();
  });

  it('applies CPCB\'s 16-of-24 rule and the 6-of-8 rule for CO and ozone', () => {
    const eligible = withAdequateCoverage([
      { metric: Metric.Pm25, average: 75, sampleCount: 16 },
      { metric: Metric.Pm10, average: 120, sampleCount: 15 },
      { metric: Metric.Ozone, average: 50, sampleCount: 6 },
      { metric: Metric.CarbonMonoxide, average: 1000, sampleCount: 5 },
    ]);
    expect(eligible[Metric.Pm25]).toBe(75);
    expect(eligible[Metric.Pm10]).toBeUndefined();
    expect(eligible[Metric.Ozone]).toBe(50);
    expect(eligible[Metric.CarbonMonoxide]).toBeUndefined();
  });

  it('yields no index when dropping short windows breaks the three-pollutant rule', () => {
    // Honest absence rather than an index computed from whatever survived.
    const eligible = withAdequateCoverage([
      { metric: Metric.Pm25, average: 75, sampleCount: 20 },
      { metric: Metric.NitrogenDioxide, average: 40, sampleCount: 20 },
      { metric: Metric.Ozone, average: 50, sampleCount: 2 },
    ]);
    expect(Object.keys(eligible)).toHaveLength(2);
    expect(computeNationalAqi(eligible)).toBeNull();
  });
});
