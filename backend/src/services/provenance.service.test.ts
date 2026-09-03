import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok } from 'neverthrow';

import type { Source } from '../models/source.model.js';
import type { ISourceRepository } from '../repositories/source.repository.js';
import { AccessMethod, Cadence, Freshness, MetadataStatus } from '../types/dataset.js';

const mockRepo: jest.Mocked<ISourceRepository> = {
  listAll: jest.fn(),
  findByKey: jest.fn(),
  findRowByKey: jest.fn(),
  findByIds: jest.fn(),
  startRun: jest.fn(),
  completeRun: jest.fn(),
  listRuns: jest.fn(),
  expireStuckRuns: jest.fn(),
};

jest.unstable_mockModule('../repositories/source.repository.js', () => ({
  SourceRepository: mockRepo,
}));

const { attachProvenance, publiclyDisplayable, needsStalenessBadge } =
  await import('./provenance.service.js');

const NOW = new Date('2026-09-03T12:00:00.000Z');

function source(overrides: Partial<Source> = {}): Source {
  return {
    key: 'data-gov-in',
    ownerModule: 'indicators',
    department: { en: 'OGD Platform India', hi: 'ओजीडी प्लेटफॉर्म इंडिया' },
    url: 'https://data.gov.in',
    attribution: 'Source: data.gov.in, Government of India',
    licence: 'GODL',
    accessMethod: AccessMethod.Api,
    cadence: Cadence.Annual,
    mayRedistribute: true,
    metadataStatus: MetadataStatus.Provisional,
    freshness: Freshness.Fresh,
    lastSuccessAt: '2026-09-03 11:00:00',
    lastVintage: '2011-03-01',
    lastRunStatus: null,
    lastRunAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockRepo)) fn.mockReset();
});

describe('attachProvenance', () => {
  it('returns an empty array without querying for an empty page', async () => {
    const result = await attachProvenance([], NOW);
    expect(result._unsafeUnwrap()).toEqual([]);
    expect(mockRepo.findByIds).not.toHaveBeenCalled();
  });

  it('queries each distinct source once for the whole page', async () => {
    mockRepo.findByIds.mockResolvedValue(ok(new Map([[1, source()]])));

    await attachProvenance(
      [
        { sourceId: 1, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' },
        { sourceId: 1, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' },
        { sourceId: 1, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' },
      ],
      NOW,
    );

    expect(mockRepo.findByIds).toHaveBeenCalledTimes(1);
    expect(mockRepo.findByIds).toHaveBeenCalledWith([1], NOW);
  });

  /** DS-2 — the value's own vintage, not the source's most recent one. */
  it("stamps the value's own vintage, not the source's latest", async () => {
    mockRepo.findByIds.mockResolvedValue(ok(new Map([[1, source({ lastVintage: '2024-01-01' })]])));

    const result = await attachProvenance(
      [{ sourceId: 1, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' }],
      NOW,
    );

    expect(result._unsafeUnwrap()[0]?.provenance?.vintage).toBe('2011-03-01');
  });

  it('computes freshness from the value fetch time', async () => {
    mockRepo.findByIds.mockResolvedValue(ok(new Map([[1, source({ cadence: Cadence.Daily })]])));

    const result = await attachProvenance(
      [{ sourceId: 1, vintage: '2026-09-01', fetchedAt: '2026-08-20 12:00:00' }],
      NOW,
    );

    expect(result._unsafeUnwrap()[0]?.provenance?.freshness).toBe(Freshness.Expired);
  });

  /** DS-1 — a value whose source is missing gets a null stamp so callers must drop it. */
  it('returns a null stamp when the source is not in the registry', async () => {
    mockRepo.findByIds.mockResolvedValue(ok(new Map()));

    const result = await attachProvenance(
      [{ sourceId: 99, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' }],
      NOW,
    );

    expect(result._unsafeUnwrap()[0]?.provenance).toBeNull();
  });
});

describe('publiclyDisplayable', () => {
  /** DS-6 — access is not redistribution. */
  it('drops values from a source that may not be redistributed', async () => {
    mockRepo.findByIds.mockResolvedValue(
      ok(
        new Map([
          [1, source({ mayRedistribute: true })],
          [2, source({ key: 'imd-cap-alerts', mayRedistribute: false })],
        ]),
      ),
    );

    const stamped = await attachProvenance(
      [
        { sourceId: 1, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' },
        { sourceId: 2, vintage: '2026-09-03', fetchedAt: '2026-09-03 11:00:00' },
      ],
      NOW,
    );

    const visible = publiclyDisplayable(stamped._unsafeUnwrap());
    expect(visible).toHaveLength(1);
    expect(visible[0]?.provenance?.sourceKey).toBe('data-gov-in');
  });

  it('drops values with no provenance at all', async () => {
    mockRepo.findByIds.mockResolvedValue(ok(new Map()));
    const stamped = await attachProvenance(
      [{ sourceId: 99, vintage: '2011-03-01', fetchedAt: '2026-09-03 11:00:00' }],
      NOW,
    );
    expect(publiclyDisplayable(stamped._unsafeUnwrap())).toHaveLength(0);
  });
});

describe('needsStalenessBadge', () => {
  it('is false only for genuinely fresh data', () => {
    expect(
      needsStalenessBadge({
        sourceKey: 'x',
        department: { en: 'x', hi: 'x' },
        url: 'https://x',
        attribution: 'x',
        vintage: '2011-03-01',
        fetchedAt: '2026-09-03 11:00:00',
        freshness: Freshness.Fresh,
        mayRedistribute: true,
      }),
    ).toBe(false);
  });

  it('is true when provenance is missing entirely', () => {
    expect(needsStalenessBadge(null)).toBe(true);
  });
});
