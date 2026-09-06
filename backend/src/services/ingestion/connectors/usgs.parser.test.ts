import { describe, expect, it } from '@jest/globals';

import { epochToMysqlUtc, parseUsgsResponse, readGeometry } from './usgs.parser.js';

/** Shaped like a real USGS FDSN feature, trimmed to the fields the connector reads. */
const feature = {
  id: 'us7000tdv4',
  properties: {
    mag: 5.1,
    place: '115 km NE of Joshīmath, India',
    time: 1788423396417,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000tdv4',
    magType: 'mb',
    status: 'reviewed',
  },
  geometry: { coordinates: [80.5, 30.9, 10] },
};

describe('parseUsgsResponse', () => {
  it('reads a well-formed feature collection', () => {
    const result = parseUsgsResponse(JSON.stringify({ features: [feature] }));

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0]?.properties.mag).toBe(5.1);
  });

  it('accepts a null magnitude so the connector can decide to skip it', () => {
    const result = parseUsgsResponse(
      JSON.stringify({
        features: [{ ...feature, properties: { ...feature.properties, mag: null } }],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0]?.properties.mag).toBeNull();
  });

  it('accepts an empty collection as a valid quiet period', () => {
    const result = parseUsgsResponse(JSON.stringify({ features: [] }));

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toHaveLength(0);
  });

  it('rejects a body that is not JSON', () => {
    const result = parseUsgsResponse('<html>502</html>');

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe(90003);
  });

  it('ignores unknown fields so an upstream addition does not fail a run', () => {
    const result = parseUsgsResponse(
      JSON.stringify({
        features: [{ ...feature, properties: { ...feature.properties, tsunami: 0 } }],
        newTopLevelField: true,
      }),
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('readGeometry', () => {
  it('reads the third coordinate as DEPTH, not elevation', () => {
    // Getting this backwards would put every earthquake 10 km into the sky.
    const geometry = readGeometry(feature);

    expect(geometry).toEqual({ lng: 80.5, lat: 30.9, depthKm: 10 });
  });

  it('returns a null depth when only two coordinates are given', () => {
    const geometry = readGeometry({ ...feature, geometry: { coordinates: [80.5, 30.9] } });

    expect(geometry).toEqual({ lng: 80.5, lat: 30.9, depthKm: null });
  });

  it('returns null when geometry is absent or unusable', () => {
    expect(readGeometry({ ...feature, geometry: null })).toBeNull();
    expect(readGeometry({ ...feature, geometry: { coordinates: [80.5] } })).toBeNull();
  });
});

describe('epochToMysqlUtc', () => {
  it('converts epoch milliseconds to a UTC datetime string', () => {
    expect(epochToMysqlUtc(1788423396417)).toBe('2026-09-03 08:16:36');
  });

  it('returns null rather than a fabricated timestamp', () => {
    expect(epochToMysqlUtc(Number.NaN)).toBeNull();
  });
});
