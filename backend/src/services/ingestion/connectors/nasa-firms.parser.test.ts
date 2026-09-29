import { describe, expect, it } from '@jest/globals';

import { classifyConfidence, parseFirmsCsv, toUtcTimestamp } from './nasa-firms.parser.js';

/** Real FIRMS column orders, trimmed to two rows each. */
const VIIRS_CSV = [
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
  '29.61234,79.45678,331.2,0.39,0.36,2026-04-12,740,N20,VIIRS,n,2.0NRT,295.1,6.4,D',
  '30.1,78.9,340.5,0.4,0.37,2026-04-12,2015,N20,VIIRS,h,2.0NRT,290.0,12.25,N',
].join('\n');

const MODIS_CSV = [
  'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight',
  '29.5,79.4,318.7,1.0,1.0,2026-04-12,0515,Terra,MODIS,85,6.1NRT,299.0,21.3,D',
  '29.6,79.5,305.0,1.0,1.0,2026-04-12,0515,Terra,MODIS,12,6.1NRT,298.0,4.0,D',
].join('\n');

describe('parseFirmsCsv', () => {
  it('reads VIIRS rows, keeping the published confidence next to the mapped one', () => {
    const result = parseFirmsCsv(VIIRS_CSV, 'VIIRS_NOAA20_NRT')._unsafeUnwrap();

    expect(result.rejected).toBe(0);
    expect(result.detections[0]).toEqual({
      sourceEventId: 'VIIRS_NOAA20_NRT:29.6123:79.4568:2026-04-12:0740:N20',
      sensor: 'VIIRS_NOAA20_NRT',
      satellite: 'N20',
      instrument: 'VIIRS',
      confidence: 'nominal',
      confidenceRaw: 'n',
      frpMw: 6.4,
      brightnessK: 331.2,
      dayNight: 'D',
      lat: 29.61234,
      lng: 79.45678,
      acquiredAt: '2026-04-12 07:40:00',
    });
    expect(result.detections[1]?.confidence).toBe('high');
  });

  it('reads MODIS brightness from its own column and bands its percentage', () => {
    const result = parseFirmsCsv(MODIS_CSV, 'MODIS_NRT')._unsafeUnwrap();

    expect(result.detections.map((d) => d.confidence)).toEqual(['high', 'low']);
    expect(result.detections[0]?.brightnessK).toBe(318.7);
  });

  it('accepts a header-only body as a day with no fires', () => {
    const header = VIIRS_CSV.split('\n')[0] ?? '';
    expect(parseFirmsCsv(header, 'VIIRS_NOAA20_NRT')._unsafeUnwrap().detections).toEqual([]);
  });

  /** FIRMS answers a bad key with HTTP 200 and a sentence. That must not read as no fires. */
  it('rejects a plain-text error body instead of reporting zero detections', () => {
    const result = parseFirmsCsv('Invalid MAP_KEY.', 'VIIRS_NOAA20_NRT');
    expect(result.isErr()).toBe(true);
  });

  it('counts a malformed row as rejected without failing the rest', () => {
    const csv = `${VIIRS_CSV}\nnot-a-number,79.4,331,0.4,0.4,2026-04-12,740,N20,VIIRS,n,2,295,6,D`;
    const result = parseFirmsCsv(csv, 'VIIRS_NOAA20_NRT')._unsafeUnwrap();

    expect(result.detections).toHaveLength(2);
    expect(result.rejected).toBe(1);
  });
});

describe('classifyConfidence', () => {
  it('uses the MODIS user guide bands at their boundaries', () => {
    expect(classifyConfidence('29', 'MODIS_NRT')).toBe('low');
    expect(classifyConfidence('30', 'MODIS_NRT')).toBe('nominal');
    expect(classifyConfidence('79', 'MODIS_NRT')).toBe('nominal');
    expect(classifyConfidence('80', 'MODIS_NRT')).toBe('high');
  });

  it('refuses values it cannot place rather than guessing', () => {
    expect(classifyConfidence('101', 'MODIS_NRT')).toBeNull();
    expect(classifyConfidence('n', 'MODIS_NRT')).toBeNull();
    expect(classifyConfidence('x', 'VIIRS_NOAA21_NRT')).toBeNull();
  });
});

describe('toUtcTimestamp', () => {
  it('restores the leading zeros FIRMS drops', () => {
    expect(toUtcTimestamp('2026-04-12', '5')).toBe('2026-04-12 00:05:00');
  });

  it('rejects impossible times and dates', () => {
    expect(toUtcTimestamp('2026-04-12', '2460')).toBeNull();
    expect(toUtcTimestamp('2026-02-31', '0100')).toBeNull();
  });
});
