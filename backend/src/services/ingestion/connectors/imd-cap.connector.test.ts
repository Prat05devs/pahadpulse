import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { Area } from '../../../models/area.model.js';
import type { IAlertRepository } from '../../../repositories/alert.repository.js';
import type { IAreaRepository } from '../../../repositories/area.repository.js';
import { AreaType } from '../../../types/area.js';
import { ERRORS } from '../../../utils/errors.js';

const mockFetchText = jest.fn<(url: string, options?: unknown) => Promise<unknown>>();
const mockAreaRepo: jest.Mocked<IAreaRepository> = {
  listDistricts: jest.fn(),
  findBySlug: jest.fn(),
  findByCode: jest.fn(),
  listChildren: jest.fn(),
  findBoundaryByAreaId: jest.fn(),
  listMapLayers: jest.fn(),
  countByType: jest.fn(),
  resolveToDistricts: jest.fn(),
};
const mockAlertRepo: jest.Mocked<IAlertRepository> = {
  upsert: jest.fn(),
  cancel: jest.fn(),
  findById: jest.fn(),
  listActive: jest.fn(),
  listActiveForArea: jest.fn(),
  countActive: jest.fn(),
};

jest.unstable_mockModule('../../../utils/http.js', () => ({ fetchText: mockFetchText }));
jest.unstable_mockModule('../../../repositories/area.repository.js', () => ({
  AreaRepository: mockAreaRepo,
}));
jest.unstable_mockModule('../../../repositories/alert.repository.js', () => ({
  AlertRepository: mockAlertRepo,
}));

const { imdCapConnector } = await import('./imd-cap.connector.js');

const INDEX_URL = 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml';

const uttarakhandArea: Area = {
  id: 1,
  type: AreaType.State,
  code: 'UK',
  slug: 'uttarakhand',
  name: { en: 'Uttarakhand', hi: 'उत्तराखंड' },
  parentId: null,
  division: null,
  headquarters: null,
  centroid: null,
  officialIds: { lgd: null, census2011: null },
};

function indexXmlWith(items: { link: string; guid: string }[]): string {
  const body = items
    .map(
      (i) =>
        `<item><title>t</title><link>${i.link}</link><description>d</description><author>a</author><category>Met</category><guid>${i.guid}</guid><pubDate>Thu, 03 Sep 2026 07:21:21 +0000</pubDate></item>`,
    )
    .join('');
  return `<?xml version="1.0"?><rss><channel>${body}</channel></rss>`;
}

function capAlertXml(opts: {
  identifier: string;
  areaDesc: string;
  status?: string;
  scope?: string;
  msgType?: string;
  severity?: string;
}): string {
  return `<?xml version="1.0"?><cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
    <cap:identifier>${opts.identifier}</cap:identifier>
    <cap:sender>x@example.com</cap:sender>
    <cap:sent>2026-09-03T12:51:21+05:30</cap:sent>
    <cap:status>${opts.status ?? 'Actual'}</cap:status>
    <cap:msgType>${opts.msgType ?? 'Alert'}</cap:msgType>
    <cap:scope>${opts.scope ?? 'Public'}</cap:scope>
    <cap:info>
      <cap:language>en</cap:language>
      <cap:category>Met</cap:category>
      <cap:event>Heavy rainfall</cap:event>
      <cap:urgency>Expected</cap:urgency>
      <cap:severity>${opts.severity ?? 'Severe'}</cap:severity>
      <cap:certainty>Likely</cap:certainty>
      <cap:expires>2026-09-04T07:00:00+05:30</cap:expires>
      <cap:senderName>IMD</cap:senderName>
      <cap:headline>Heavy rainfall warning</cap:headline>
      <cap:description>Heavy rainfall expected.</cap:description>
      <cap:area><cap:areaDesc>${opts.areaDesc}</cap:areaDesc></cap:area>
    </cap:info>
  </cap:alert>`;
}

function mockFetchRouter(routes: Record<string, string>): void {
  mockFetchText.mockImplementation((url: string) => {
    const body = routes[url];
    if (body === undefined) return Promise.resolve(err(ERRORS.UPSTREAM_UNAVAILABLE));
    if (body === 'FAIL') return Promise.resolve(err(ERRORS.UPSTREAM_UNAVAILABLE));
    return Promise.resolve(ok(body));
  });
}

beforeEach(() => {
  mockFetchText.mockReset();
  for (const fn of Object.values(mockAreaRepo)) fn.mockReset();
  for (const fn of Object.values(mockAlertRepo)) fn.mockReset();
  mockAreaRepo.findByCode.mockResolvedValue(ok(uttarakhandArea));
  mockAreaRepo.resolveToDistricts.mockResolvedValue(ok([]));
  mockAlertRepo.upsert.mockResolvedValue(ok(1));
  mockAlertRepo.cancel.mockResolvedValue(ok(true));
});

const context = {
  sourceId: 5,
  sourceKey: 'imd-cap-alerts',
  runId: 1,
  now: new Date('2026-09-03T12:00:00Z'),
};

describe('imdCapConnector.fetch', () => {
  it('propagates a failure to fetch the RSS index', async () => {
    mockFetchRouter({ [INDEX_URL]: 'FAIL' });
    const result = await imdCapConnector.fetch(context);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.UPSTREAM_UNAVAILABLE.code);
  });

  it('writes an alert whose area mentions Uttarakhand', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({ identifier: 'id-1', areaDesc: 'UTTARAKHAND' }),
    });

    const result = await imdCapConnector.fetch(context);
    const outcome = result._unsafeUnwrap();

    expect(outcome.rowsWritten).toBe(1);
    expect(outcome.rowsRejected).toBe(0);
    expect(outcome.vintage).toBe('2026-09-03');
    expect(mockAlertRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ sourceAlertId: 'id-1', areaIds: [1] }),
    );
  });

  it('does not store an alert whose area does not mention Uttarakhand', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({ identifier: 'id-1', areaDesc: 'ODISHA' }),
    });

    const result = await imdCapConnector.fetch(context);
    const outcome = result._unsafeUnwrap();

    expect(outcome.rowsWritten).toBe(0);
    expect(mockAlertRepo.upsert).not.toHaveBeenCalled();
  });

  it('never ingests a Test-status message even if it names Uttarakhand', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({
        identifier: 'id-1',
        areaDesc: 'UTTARAKHAND',
        status: 'Test',
      }),
    });

    const result = await imdCapConnector.fetch(context);
    expect(result._unsafeUnwrap().rowsWritten).toBe(0);
    expect(mockAlertRepo.upsert).not.toHaveBeenCalled();
  });

  it('never ingests a non-Public scope message', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({
        identifier: 'id-1',
        areaDesc: 'UTTARAKHAND',
        scope: 'Restricted',
      }),
    });

    const result = await imdCapConnector.fetch(context);
    expect(result._unsafeUnwrap().rowsWritten).toBe(0);
  });

  /** ALR-1 — a Cancel message updates the existing record; it never creates a new one. */
  it('cancels rather than upserts on msgType=Cancel', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({
        identifier: 'id-1',
        areaDesc: 'UTTARAKHAND',
        msgType: 'Cancel',
      }),
    });

    const result = await imdCapConnector.fetch(context);

    expect(mockAlertRepo.cancel).toHaveBeenCalledWith(context.sourceId, 'id-1');
    expect(mockAlertRepo.upsert).not.toHaveBeenCalled();
    expect(result._unsafeUnwrap().rowsWritten).toBe(1);
  });

  it('counts a fetch failure on one item as rejected without failing the whole run', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([
        { link: 'https://x/1.xml', guid: 'g1' },
        { link: 'https://x/2.xml', guid: 'g2' },
      ]),
      'https://x/1.xml': 'FAIL',
      'https://x/2.xml': capAlertXml({ identifier: 'id-2', areaDesc: 'UTTARAKHAND' }),
    });

    const result = await imdCapConnector.fetch(context);
    const outcome = result._unsafeUnwrap();

    expect(outcome.rowsRejected).toBe(1);
    expect(outcome.rowsWritten).toBe(1);
  });

  it('counts unparseable item XML as rejected', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': 'this is not xml at all {{{',
    });

    const result = await imdCapConnector.fetch(context);
    expect(result._unsafeUnwrap().rowsRejected).toBe(1);
  });

  it('includes any resolved district ids alongside the state area', async () => {
    mockFetchRouter({
      [INDEX_URL]: indexXmlWith([{ link: 'https://x/1.xml', guid: 'g1' }]),
      'https://x/1.xml': capAlertXml({ identifier: 'id-1', areaDesc: 'UTTARAKHAND' }),
    });
    mockAreaRepo.resolveToDistricts.mockResolvedValue(
      ok([{ ...uttarakhandArea, id: 42, type: AreaType.District, slug: 'dehradun' }]),
    );

    await imdCapConnector.fetch(context);

    expect(mockAlertRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ areaIds: expect.arrayContaining([1, 42]) }),
    );
  });

  it('caps the number of items fetched per run', async () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      link: `https://x/${i}.xml`,
      guid: `g${i}`,
    }));
    const routes: Record<string, string> = { [INDEX_URL]: indexXmlWith(items) };
    for (const item of items) {
      routes[item.link] = capAlertXml({ identifier: item.guid, areaDesc: 'UTTARAKHAND' });
    }
    mockFetchRouter(routes);

    const result = await imdCapConnector.fetch(context);
    // index fetch (1) + capped item fetches (30, per IMD_CAP.MAX_ITEMS_PER_RUN)
    expect(mockFetchText).toHaveBeenCalledTimes(31);
    expect(result._unsafeUnwrap().rowsWritten).toBe(30);
  });
});
