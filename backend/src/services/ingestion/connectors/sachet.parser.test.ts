import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import {
  findDistrictsInText,
  normalizeLanguage,
  parseSachetAlert,
  parseSachetIndex,
  parseSachetPolygons,
  selectInfo,
  type DistrictNameCandidate,
} from './sachet.parser.js';

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

const indexXml = fixture('sachet-uk-index.sample.xml');
const alertXml = fixture('sachet-alert.sample.xml');
const polygonXml = fixture('sachet-polygon.sample.xml');

describe('parseSachetIndex', () => {
  it('reads the live Uttarakhand feed fixture', () => {
    const result = parseSachetIndex(indexXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.length).toBeGreaterThan(0);
    const first = result.value[0];
    expect(first?.identifier).toMatch(/^\d+$/);
    expect(first?.link).toContain('FetchXMLFile?identifier=');
  });

  it('extracts the identifier from a guid element carrying attributes', () => {
    const result = parseSachetIndex(
      `<rss><channel><item>
         <title>t</title>
         <link>https://example.test/x</link>
         <guid isPermaLink="false">1788538983366009</guid>
       </item></channel></rss>`,
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0]?.identifier).toBe('1788538983366009');
  });

  it('treats an empty feed as no alerts, not as a failure', () => {
    // A quiet day must not look like an outage in the ingestion health board.
    const result = parseSachetIndex('<rss><channel><title>Uttarakhand</title></channel></rss>');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toEqual([]);
  });

  it('handles a single-item feed that does not parse as an array', () => {
    const result = parseSachetIndex(
      `<rss><channel><item><link>https://example.test/x</link><guid>42</guid></item></channel></rss>`,
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toHaveLength(1);
  });

  it('rejects a document that is not an RSS feed', () => {
    expect(parseSachetIndex('<html><body>busy</body></html>').isErr()).toBe(true);
  });
});

describe('parseSachetAlert', () => {
  it('reads both language blocks from the live fixture', () => {
    const result = parseSachetAlert(alertXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.status).toBe('Actual');
    expect(result.value.scope).toBe('Public');
    expect(result.value.infos).toHaveLength(2);
    expect(result.value.infos.map((info) => info.language).sort()).toEqual(['en', 'hi']);
  });

  it('falls back to the headline when description is empty', () => {
    // Every SACHET document seen publishes <cap:description/>. The IMD parser rejects that
    // case, which is why this parser exists at all.
    const result = parseSachetAlert(alertXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const english = result.value.infos.find((info) => info.language === 'en');
    expect(english?.description).toBe(english?.headline);
    expect(english?.description.length).toBeGreaterThan(0);
  });

  it('keeps severity, urgency and certainty as the source states them', () => {
    const result = parseSachetAlert(alertXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const english = result.value.infos.find((info) => info.language === 'en');
    expect(english?.severity).toBe('Moderate');
    expect(english?.urgency).toBe('Expected');
    expect(english?.certainty).toBe('Possible');
    expect(english?.expires).not.toBeNull();
  });

  it('rejects a document with no readable info block', () => {
    expect(
      parseSachetAlert(
        '<alert><identifier>1</identifier><sent>2026-09-04T21:55:10+05:30</sent></alert>',
      ).isErr(),
    ).toBe(true);
  });

  it('rejects a document missing an identifier', () => {
    expect(parseSachetAlert('<alert><sent>2026-09-04T21:55:10+05:30</sent></alert>').isErr()).toBe(
      true,
    );
  });
});

describe('normalizeLanguage', () => {
  it.each([
    ['en-IN', 'en'],
    ['HI', 'hi'],
    ['hi-IN', 'hi'],
    ['', 'en'],
  ])('normalises %s to %s', (raw, expected) => {
    expect(normalizeLanguage(raw)).toBe(expected);
  });
});

describe('selectInfo', () => {
  it('prefers the English block', () => {
    const result = parseSachetAlert(alertXml);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(selectInfo(result.value.infos)?.language).toBe('en');
  });

  it('falls back to the only block when there is no English one', () => {
    const result = parseSachetAlert(alertXml);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const hindiOnly = result.value.infos.filter((info) => info.language === 'hi');
    expect(selectInfo(hindiOnly)?.language).toBe('hi');
  });

  it('returns null when there is nothing to select', () => {
    expect(selectInfo([])).toBeNull();
  });
});

describe('parseSachetPolygons', () => {
  it('de-duplicates the rings SACHET repeats per language block', () => {
    // The live fixture carries 4 <polygon> elements: 2 distinct rings, each repeated once
    // for the English block and once for the Hindi one.
    const result = parseSachetPolygons(polygonXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value === null) throw new Error('expected geometry');

    expect(result.value.type).toBe('MultiPolygon');
    if (result.value.type !== 'MultiPolygon') return;
    expect(result.value.coordinates).toHaveLength(2);
  });

  it('produces coordinates in longitude, latitude order inside Uttarakhand', () => {
    const result = parseSachetPolygons(polygonXml);

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value === null) throw new Error('expected geometry');
    if (result.value.type !== 'MultiPolygon') throw new Error('expected a MultiPolygon');

    const [lng, lat] = result.value.coordinates[0]?.[0]?.[0] ?? [0, 0];
    // Uttarakhand spans roughly 77.5–81.1 E and 28.7–31.5 N.
    expect(lng).toBeGreaterThan(77);
    expect(lng).toBeLessThan(82);
    expect(lat).toBeGreaterThan(28);
    expect(lat).toBeLessThan(32);
  });

  it('returns a plain Polygon for a single ring', () => {
    const result = parseSachetPolygons(
      '<alert><polygon>30.7,79.0 30.8,79.1 30.9,79.0 30.7,79.0</polygon></alert>',
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value?.type).toBe('Polygon');
  });

  it('returns null when the alert has no polygon, rather than failing', () => {
    const result = parseSachetPolygons('<alert><identifier>1</identifier></alert>');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toBeNull();
  });

  it('keeps the good rings when one is malformed', () => {
    const result = parseSachetPolygons(
      `<alert>
         <polygon>not,a,polygon</polygon>
         <polygon>30.7,79.0 30.8,79.1 30.9,79.0 30.7,79.0</polygon>
       </alert>`,
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value?.type).toBe('Polygon');
  });
});

describe('findDistrictsInText', () => {
  const districts: DistrictNameCandidate[] = [
    { id: 2, nameEn: 'Almora', nameHi: 'अल्मोड़ा' },
    { id: 4, nameEn: 'Chamoli', nameHi: 'चमोली' },
    { id: 6, nameEn: 'Dehradun', nameHi: 'देहरादून' },
    { id: 9, nameEn: 'Pauri Garhwal', nameHi: 'पौड़ी गढ़वाल' },
    { id: 14, nameEn: 'Uttarkashi', nameHi: 'उत्तरकाशी' },
  ];

  it('finds the districts named in a real SACHET headline', () => {
    const headline =
      'Thunder shower / Thunder accompanied with intense spell of rain and lightning is likely ' +
      'to occur at a few places over Uttarkashi, Almora, Chamoli in next 3 hours.';

    expect(findDistrictsInText(headline, districts).sort((a, b) => a - b)).toEqual([2, 4, 14]);
  });

  it('finds districts named in Hindi', () => {
    expect(findDistrictsInText('देहरादून और चमोली में भारी वर्षा', districts).sort((a, b) => a - b)).toEqual(
      [4, 6],
    );
  });

  it('matches a Garhwal district written without its suffix', () => {
    expect(findDistrictsInText('heavy rain over Pauri in next 3 hours', districts)).toEqual([9]);
  });

  it('returns nothing when the text names no district', () => {
    expect(findDistrictsInText('districts of uttarakhand', districts)).toEqual([]);
  });

  it('is case insensitive', () => {
    expect(findDistrictsInText('RAIN OVER DEHRADUN', districts)).toEqual([6]);
  });
});
