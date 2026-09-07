import { describe, expect, it } from 'vitest';
import { AirQualitySchema } from './schemas';

const oldApiPayload = {
  station: { id: 1, sourceStationCode: 'x', type: 'weather', name: { en: 'A', hi: 'ए' }, areaId: 1, lat: 1, lng: 1, riverName: null, sourceId: 1 },
  aqi: { value: 118, band: 'unhealthy_sensitive' },
  observedAt: '2026-09-07T08:00:00.000Z',
  source: { id: 1, key: 'k', department: { en: 'd', hi: 'द' }, attribution: 'a' },
};

/**
 * Deploy-order tolerance.
 *
 * The web app and the API ship from the same push but deploy independently, and Vercel
 * finishes in seconds while Render rebuilds a container for minutes. Any field the frontend
 * REQUIRES before the API can send it makes every air quality panel vanish for the length of
 * that window — a self-inflicted outage on each release that adds a field.
 *
 * So a newly added field must parse as absent. This test is the guard for the next one.
 */
describe('air quality schema deploy tolerance', () => {
  it('accepts a payload from an API that has not redeployed yet', () => {
    const parsed = AirQualitySchema.parse(oldApiPayload);
    expect(parsed.nationalAqi).toBeNull();
  });
});
