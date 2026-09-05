import { describe, expect, it } from '@jest/globals';

import { collectRoadRefs, parseRoadRefs, sortRoadRefs } from './osm-roads.parser.js';

describe('parseRoadRefs', () => {
  it.each([
    ['NH34', 'NH34'],
    ['NH 34', 'NH34'],
    ['NH 334', 'NH334'],
    ['nh107a', 'NH107A'],
    ['SH8', 'SH8'],
    ['SH 3', 'SH3'],
    ['SH-12', 'SH12'],
    ['SH09', 'SH9'],
    ['NH 007', 'NH7'],
  ])('normalises %s to %s', (raw, expected) => {
    // Every one of these spellings appears in the real Uttarakhand extract. Without
    // normalising, NH34 and "NH 34" would be listed as two different highways.
    expect(parseRoadRefs(raw)[0]?.ref).toBe(expected);
  });

  it('splits a concurrency into both highways', () => {
    // A carriageway carrying two routes belongs on both lists.
    expect(parseRoadRefs('NH34:NH707A').map((road) => road.ref)).toEqual(['NH34', 'NH707A']);
  });

  it('splits semicolon and comma separated refs', () => {
    expect(parseRoadRefs('NH7; SH 12, NH109D').map((road) => road.ref)).toEqual([
      'NH7',
      'SH12',
      'NH109D',
    ]);
  });

  it('rejects a decommissioned alignment', () => {
    // "Old NH 58" is a former alignment, not the current highway. Listing it would tell a
    // traveller a road exists under a number that no longer routes there.
    expect(parseRoadRefs('Old NH 58')).toEqual([]);
  });

  it.each(['MDR', 'MDR65W', 'State Road', 'Khirsu Road', 'Haridwar Bypass', 'SH', 'Level'])(
    'ignores non-highway ref %s',
    (raw) => {
      expect(parseRoadRefs(raw)).toEqual([]);
    }
  );

  it('treats a leading-zero variant as the same highway', () => {
    // Both spellings are in the live extract. Without this, SH9 and SH09 list twice.
    expect(parseRoadRefs('SH09;SH9')).toHaveLength(1);
  });

  it('de-duplicates a ref repeated within one tag', () => {
    expect(parseRoadRefs('NH34;NH34')).toHaveLength(1);
  });

  it('records the network and bare number', () => {
    expect(parseRoadRefs('NH109D')[0]).toEqual({
      network: 'NH',
      ref: 'NH109D',
      number: '109D',
    });
  });

  it('returns nothing for an empty tag', () => {
    expect(parseRoadRefs('')).toEqual([]);
  });
});

describe('sortRoadRefs', () => {
  it('orders numerically, not lexically, and puts NH before SH', () => {
    // The bug this guards: a string sort places NH107 before NH7.
    const sorted = sortRoadRefs([
      { network: 'SH', ref: 'SH12', number: '12' },
      { network: 'NH', ref: 'NH107', number: '107' },
      { network: 'NH', ref: 'NH7', number: '7' },
      { network: 'NH', ref: 'NH107A', number: '107A' },
      { network: 'NH', ref: 'NH34', number: '34' },
    ]);

    expect(sorted.map((road) => road.ref)).toEqual(['NH7', 'NH34', 'NH107', 'NH107A', 'SH12']);
  });
});

describe('collectRoadRefs', () => {
  const body = JSON.stringify({
    elements: [
      { type: 'way', tags: { highway: 'trunk', ref: 'NH 34' } },
      { type: 'way', tags: { highway: 'trunk', ref: 'NH34' } },
      { type: 'way', tags: { highway: 'primary', ref: 'SH-12' } },
      { type: 'way', tags: { highway: 'primary', ref: 'Old NH 58' } },
      { type: 'way', tags: { highway: 'primary' } },
      { type: 'way' },
    ],
  });

  it('collapses spelling variants of one highway into a single entry', () => {
    const result = collectRoadRefs(body);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.map((road) => road.ref)).toEqual(['NH34', 'SH12']);
  });

  it('rejects the HTML error page a busy Overpass mirror returns', () => {
    expect(collectRoadRefs('<html><body>too busy</body></html>').isErr()).toBe(true);
  });

  it('rejects a response with no usable refs', () => {
    expect(collectRoadRefs(JSON.stringify({ elements: [] })).isErr()).toBe(true);
  });

  it('rejects a response with no elements array', () => {
    expect(collectRoadRefs(JSON.stringify({ version: 0.6 })).isErr()).toBe(true);
  });
});
