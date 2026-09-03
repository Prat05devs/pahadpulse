import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import { AlertCertainty, AlertSeverity, AlertType, AlertUrgency } from '../../../types/alert.js';
import {
  classifyAlertType,
  districtNameCandidates,
  isRelevantToUttarakhand,
  normalizeCertainty,
  normalizeSeverity,
  normalizeUrgency,
  parseCapAlert,
  parseCapIndex,
} from './imd-cap.parser.js';

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

// These two files were fetched live from https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
// on 2026-09-03. Real IMD payload — the point of these tests is proving the parser handles
// what the source actually sends, not a shape we imagined.
const REAL_INDEX_XML = fixture('imd-cap-index.sample.xml');
const REAL_ALERT_XML = fixture('imd-cap-alert.sample.xml');
const UTTARAKHAND_FIXTURE_XML = fixture('imd-cap-alert-uttarakhand.fixture.xml');

describe('parseCapIndex', () => {
  it('parses every item from the real feed', () => {
    const result = parseCapIndex(REAL_INDEX_XML);
    const items = result._unsafeUnwrap();
    expect(items).toHaveLength(10);
  });

  it('extracts the link and guid the connector needs to fetch the full CAP document', () => {
    const items = parseCapIndex(REAL_INDEX_XML)._unsafeUnwrap();
    expect(items[0]).toEqual({
      link: 'https://cap-sources.s3.amazonaws.com/in-imd-en/2026-09-03-07-21-21.xml',
      guid: 'urn:oid:2.49.0.1.356.0.2026.9.3.7.21.21',
      pubDate: 'Thu, 03 Sep 2026 07:21:21 +0000',
    });
  });

  it('fails on unparseable XML rather than returning a partial result', () => {
    const result = parseCapIndex('not xml at all { garbage');
    expect(result.isErr()).toBe(true);
  });

  it('fails on well-formed XML that is not an RSS feed', () => {
    const result = parseCapIndex('<?xml version="1.0"?><nope>hello</nope>');
    expect(result.isErr()).toBe(true);
  });

  it('handles a single-item feed without an array wrapper', () => {
    const single = `<?xml version="1.0"?><rss><channel><item><link>https://x/1.xml</link><guid>g1</guid><pubDate>Thu, 03 Sep 2026 00:00:00 +0000</pubDate></item></channel></rss>`;
    const items = parseCapIndex(single)._unsafeUnwrap();
    expect(items).toHaveLength(1);
  });
});

describe('parseCapAlert — against the real fetched CAP document', () => {
  it('extracts every field the connector needs', () => {
    const alert = parseCapAlert(REAL_ALERT_XML)._unsafeUnwrap();

    expect(alert.identifier).toBe('urn:oid:2.49.0.1.356.0.2026.9.3.7.21.21');
    expect(alert.status).toBe('Actual');
    expect(alert.msgType).toBe('Alert');
    expect(alert.scope).toBe('Public');
    expect(alert.severity).toBe('Severe');
    expect(alert.urgency).toBe('Expected');
    expect(alert.certainty).toBe('Likely');
    expect(alert.headline).toBe('Heavy to very heavy with extremely heavy rainfall');
    expect(alert.senderName).toBe('NWFC DIVISION, IMD, NEW DELHI');
    expect(alert.onset).toBe('2026-09-03T07:00:00+05:30');
    expect(alert.expires).toBe('2026-09-04T07:00:00+05:30');
    expect(alert.instruction).toContain('Avoid roadway underpasses');
  });

  it('extracts the area block', () => {
    const alert = parseCapAlert(REAL_ALERT_XML)._unsafeUnwrap();
    expect(alert.areas).toEqual([{ areaDesc: 'ODISHA' }]);
  });

  it('is not relevant to Uttarakhand', () => {
    const alert = parseCapAlert(REAL_ALERT_XML)._unsafeUnwrap();
    expect(isRelevantToUttarakhand(alert.areas.map((a) => a.areaDesc))).toBe(false);
  });

  it('does not choke on the embedded XML-DSig signature block', () => {
    // The real document has a full <ds:Signature> block after </cap:info> — proving the
    // parser tolerates content it does not use, rather than requiring a stripped document.
    expect(REAL_ALERT_XML).toContain('ds:Signature');
    expect(parseCapAlert(REAL_ALERT_XML).isOk()).toBe(true);
  });
});

describe('parseCapAlert — against the synthetic Uttarakhand fixture', () => {
  it('is relevant to Uttarakhand', () => {
    const alert = parseCapAlert(UTTARAKHAND_FIXTURE_XML)._unsafeUnwrap();
    expect(isRelevantToUttarakhand(alert.areas.map((a) => a.areaDesc))).toBe(true);
  });

  it('classifies as weather from the Met category context', () => {
    const alert = parseCapAlert(UTTARAKHAND_FIXTURE_XML)._unsafeUnwrap();
    expect(classifyAlertType(alert.event, alert.headline, alert.description)).toBe(
      AlertType.Weather,
    );
  });
});

describe('parseCapAlert — malformed input', () => {
  it('fails when the identifier is missing', () => {
    const xml = `<?xml version="1.0"?><cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><cap:sent>2026-01-01T00:00:00+05:30</cap:sent><cap:info><cap:headline>x</cap:headline><cap:description>x</cap:description></cap:info></cap:alert>`;
    expect(parseCapAlert(xml).isErr()).toBe(true);
  });

  it('fails when there is no info block', () => {
    const xml = `<?xml version="1.0"?><cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><cap:identifier>x</cap:identifier><cap:sent>2026-01-01T00:00:00+05:30</cap:sent></cap:alert>`;
    expect(parseCapAlert(xml).isErr()).toBe(true);
  });

  it('fails on unparseable XML', () => {
    expect(parseCapAlert('{{{ not xml').isErr()).toBe(true);
  });
});

describe('normalizeSeverity', () => {
  it('maps every CAP severity value case-insensitively', () => {
    expect(normalizeSeverity('Extreme')).toBe(AlertSeverity.Extreme);
    expect(normalizeSeverity('severe')).toBe(AlertSeverity.Severe);
    expect(normalizeSeverity('MODERATE')).toBe(AlertSeverity.Moderate);
    expect(normalizeSeverity('Minor')).toBe(AlertSeverity.Minor);
  });

  /** Never guessed — an unrecognized value becomes Unknown, not a fabricated default. */
  it('falls back to Unknown for anything else', () => {
    expect(normalizeSeverity('Unknown')).toBe(AlertSeverity.Unknown);
    expect(normalizeSeverity('')).toBe(AlertSeverity.Unknown);
    expect(normalizeSeverity('Catastrophic')).toBe(AlertSeverity.Unknown);
  });
});

describe('normalizeUrgency', () => {
  it('maps known values and falls back to Unknown', () => {
    expect(normalizeUrgency('Immediate')).toBe(AlertUrgency.Immediate);
    expect(normalizeUrgency('Expected')).toBe(AlertUrgency.Expected);
    expect(normalizeUrgency('nonsense')).toBe(AlertUrgency.Unknown);
  });
});

describe('normalizeCertainty', () => {
  it('maps known values and falls back to Unknown', () => {
    expect(normalizeCertainty('Likely')).toBe(AlertCertainty.Likely);
    expect(normalizeCertainty('Observed')).toBe(AlertCertainty.Observed);
    expect(normalizeCertainty('nonsense')).toBe(AlertCertainty.Unknown);
  });
});

describe('classifyAlertType', () => {
  it('classifies flood keywords', () => {
    expect(classifyAlertType('Flash flood warning', '', '')).toBe(AlertType.Flood);
  });

  it('classifies river keywords', () => {
    expect(classifyAlertType('', 'River water level rising', '')).toBe(AlertType.River);
  });

  it('classifies disaster keywords', () => {
    expect(classifyAlertType('', '', 'Landslide risk in hill districts')).toBe(AlertType.Disaster);
  });

  it('falls back to Weather, matching the source category, when nothing matches', () => {
    expect(classifyAlertType('Extremely heavy', 'Heavy rainfall', 'Rain expected')).toBe(
      AlertType.Weather,
    );
  });
});

describe('isRelevantToUttarakhand', () => {
  it('matches case-insensitively', () => {
    expect(isRelevantToUttarakhand(['uttarakhand'])).toBe(true);
    expect(isRelevantToUttarakhand(['UTTARAKHAND'])).toBe(true);
  });

  it('matches the historical name Uttaranchal', () => {
    expect(isRelevantToUttarakhand(['Uttaranchal'])).toBe(true);
  });

  it('does not match an unrelated state', () => {
    expect(isRelevantToUttarakhand(['ODISHA'])).toBe(false);
  });

  it('matches when Uttarakhand is one of several area blocks', () => {
    expect(isRelevantToUttarakhand(['Himachal Pradesh', 'Uttarakhand', 'Punjab'])).toBe(true);
  });
});

describe('districtNameCandidates', () => {
  it('passes area descriptions through for AreaRepository to resolve', () => {
    expect(districtNameCandidates(['Dehradun', 'Nainital'])).toEqual(['Dehradun', 'Nainital']);
  });
});
