import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import { AlertSeverity, AlertType } from '../../../types/alert.js';
import {
  classifyGdacsEventType,
  gdacsTimestampToUtc,
  normalizeGdacsAlertLevel,
  parseGdacsResponse,
  pointCoordinates,
} from './gdacs.parser.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '__tests__',
  'fixtures',
);

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8');
}

const indiaJson = fixture('gdacs-india.sample.json');

describe('parseGdacsResponse', () => {
  it('reads the live India event list fixture', () => {
    const result = parseGdacsResponse(indiaJson);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.length).toBeGreaterThan(0);
    expect(result.value[0]?.properties.eventtype).toEqual(expect.any(String));
  });

  it('rejects a body that is not JSON', () => {
    const result = parseGdacsResponse('<html>503</html>');

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe(90003);
  });

  it('accepts an event id as either a number or a string', () => {
    const asNumber = parseGdacsResponse(
      JSON.stringify({ features: [{ properties: { eventtype: 'FL', eventid: 1104121 } }] }),
    );
    const asString = parseGdacsResponse(
      JSON.stringify({ features: [{ properties: { eventtype: 'FL', eventid: '1104121' } }] }),
    );

    expect(asNumber.isOk()).toBe(true);
    expect(asString.isOk()).toBe(true);
  });

  it('accepts an empty feature list as a valid quiet period', () => {
    const result = parseGdacsResponse(JSON.stringify({ features: [] }));

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toHaveLength(0);
  });
});

describe('classifyGdacsEventType', () => {
  it('maps a flood to the flood type', () => {
    expect(classifyGdacsEventType('FL')).toBe(AlertType.Flood);
  });

  it('maps an earthquake to disaster rather than weather', () => {
    expect(classifyGdacsEventType('EQ')).toBe(AlertType.Disaster);
  });

  it('is case insensitive', () => {
    expect(classifyGdacsEventType('fl')).toBe(AlertType.Flood);
  });

  it('falls back to disaster for an unrecognised type', () => {
    expect(classifyGdacsEventType('XX')).toBe(AlertType.Disaster);
  });
});

describe('normalizeGdacsAlertLevel', () => {
  it('maps the three GDACS levels onto the CAP scale', () => {
    expect(normalizeGdacsAlertLevel('Green')).toBe(AlertSeverity.Minor);
    expect(normalizeGdacsAlertLevel('Orange')).toBe(AlertSeverity.Severe);
    expect(normalizeGdacsAlertLevel('Red')).toBe(AlertSeverity.Extreme);
  });

  it('never invents a moderate level GDACS does not publish', () => {
    const levels = ['Green', 'Orange', 'Red'].map(normalizeGdacsAlertLevel);
    expect(levels).not.toContain(AlertSeverity.Moderate);
  });

  it('returns unknown rather than guessing', () => {
    expect(normalizeGdacsAlertLevel('Purple')).toBe(AlertSeverity.Unknown);
    expect(normalizeGdacsAlertLevel(undefined)).toBe(AlertSeverity.Unknown);
  });
});

describe('gdacsTimestampToUtc', () => {
  it('reads a zoneless GDACS timestamp as UTC', () => {
    expect(gdacsTimestampToUtc('2026-08-09T01:00:00')).toBe('2026-08-09T01:00:00.000Z');
  });

  it('respects a timestamp that states its own zone', () => {
    expect(gdacsTimestampToUtc('2026-08-09T01:00:00Z')).toBe('2026-08-09T01:00:00.000Z');
  });

  it('returns null for absent or unparseable input', () => {
    expect(gdacsTimestampToUtc(undefined)).toBeNull();
    expect(gdacsTimestampToUtc('')).toBeNull();
    expect(gdacsTimestampToUtc('soon')).toBeNull();
  });
});

describe('pointCoordinates', () => {
  it('reads [lng, lat] from a Point', () => {
    const coordinates = pointCoordinates({
      geometry: { type: 'Point', coordinates: [79.5542, 29.3506] },
      properties: { eventtype: 'FL', eventid: 1 },
    });

    expect(coordinates).toEqual([79.5542, 29.3506]);
  });

  it('ignores geometry that is not a Point', () => {
    expect(
      pointCoordinates({
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { eventtype: 'FL', eventid: 1 },
      }),
    ).toBeNull();
  });

  it('returns null when geometry is absent', () => {
    expect(pointCoordinates({ properties: { eventtype: 'FL', eventid: 1 } })).toBeNull();
    expect(
      pointCoordinates({ geometry: null, properties: { eventtype: 'FL', eventid: 1 } }),
    ).toBeNull();
  });
});
