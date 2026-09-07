import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { Area } from '../models/area.model.js';
import type { Alert } from '../models/alert.model.js';
import type { Source } from '../models/source.model.js';
import type { IAlertRepository } from '../repositories/alert.repository.js';
import type { IAreaRepository } from '../repositories/area.repository.js';
import type { ISourceRepository } from '../repositories/source.repository.js';
import { AreaType } from '../types/area.js';
import { AccessMethod, Cadence, Freshness, MetadataStatus } from '../types/dataset.js';
import {
  AlertCertainty,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AlertUrgency,
} from '../types/alert.js';
import { ERRORS } from '../utils/errors.js';

const mockAlertRepo: jest.Mocked<IAlertRepository> = {
  upsert: jest.fn(),
  cancel: jest.fn(),
  findById: jest.fn(),
  listActive: jest.fn(),
  listActiveForArea: jest.fn(),
  countActive: jest.fn(),
};
const mockAreaRepo: jest.Mocked<IAreaRepository> = {
  listDistricts: jest.fn(),
  findBySlug: jest.fn(),
  findByCode: jest.fn(),
  listChildren: jest.fn(),
  findBoundaryByAreaId: jest.fn(),
  listMapLayers: jest.fn(),
  countByType: jest.fn(),
  resolveToDistricts: jest.fn(),
  listDistrictBoundaries: jest.fn(),
  listDistrictNames: jest.fn(),
  upsertBoundary: jest.fn(),
  listTehsils: jest.fn(),
  listVillagesByTehsil: jest.fn(),
  replaceVillagesByGeometry: jest.fn(),
};
const mockSourceRepo: jest.Mocked<ISourceRepository> = {
  listAll: jest.fn(),
  findByKey: jest.fn(),
  findRowByKey: jest.fn(),
  findByIds: jest.fn(),
  startRun: jest.fn(),
  completeRun: jest.fn(),
  listRuns: jest.fn(),
  expireStuckRuns: jest.fn(),
};

jest.unstable_mockModule('../repositories/alert.repository.js', () => ({
  AlertRepository: mockAlertRepo,
}));
jest.unstable_mockModule('../repositories/area.repository.js', () => ({
  AreaRepository: mockAreaRepo,
}));
jest.unstable_mockModule('../repositories/source.repository.js', () => ({
  SourceRepository: mockSourceRepo,
}));

const controller = await import('./alert.controller.js');

const NOW = new Date('2026-09-03T12:00:00.000Z');

function imdSource(overrides: Partial<Source> = {}): Source {
  return {
    key: 'imd-cap-alerts',
    ownerModule: 'alerts',
    department: { en: 'IMD', hi: 'आईएमडी' },
    url: 'https://mausam.imd.gov.in',
    attribution: 'Source: IMD',
    licence: 'Not confirmed',
    accessMethod: AccessMethod.Feed,
    cadence: Cadence.Realtime,
    mayRedistribute: false,
    metadataStatus: MetadataStatus.Provisional,
    freshness: Freshness.Fresh,
    lastSuccessAt: '2026-09-03 11:00:00',
    lastVintage: '2026-09-03',
    lastRunStatus: null,
    lastRunAt: null,
    ...overrides,
  };
}

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 1,
    sourceId: 1,
    sourceAlertId: 'urn:oid:test-1',
    type: AlertType.Weather,
    severity: AlertSeverity.Severe,
    urgency: AlertUrgency.Expected,
    certainty: AlertCertainty.Likely,
    status: AlertStatus.Active,
    headline: 'Heavy rainfall warning',
    body: 'Heavy rainfall expected.',
    instruction: null,
    language: 'en',
    authority: 'IMD',
    webUrl: null,
    geometry: null,
    centroid: null,
    issuedAt: '2026-09-03 07:00:00',
    effectiveFrom: null,
    expiresAt: '2026-09-04 07:00:00',
    fetchedAt: '2026-09-03 11:00:00',
    areas: [{ id: 1, slug: 'uttarakhand', name: { en: 'Uttarakhand', hi: 'उत्तराखंड' } }],
    ...overrides,
  };
}

function district(overrides: Partial<Area> = {}): Area {
  return {
    id: 5,
    type: AreaType.District,
    code: 'UK-DD',
    slug: 'dehradun',
    name: { en: 'Dehradun', hi: 'देहरादून' },
    parentId: 1,
    division: null,
    headquarters: null,
    centroid: null,
    officialIds: { lgd: null, census2011: null },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockAlertRepo)) fn.mockReset();
  for (const fn of Object.values(mockAreaRepo)) fn.mockReset();
  for (const fn of Object.values(mockSourceRepo)) fn.mockReset();
});

describe('listActive', () => {
  /** DS-6 — a value from a non-redistributable source is dropped from the public API. */
  it('drops alerts from a source that may not be redistributed', async () => {
    mockAlertRepo.listActive.mockResolvedValue(
      ok({ data: [alert()], pagination: { hasNext: false, nextCursor: null } }),
    );
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: false })]])),
    );

    const result = await controller.listActive({ cursor: 100, limit: 20 }, NOW);
    expect(result._unsafeUnwrap().data).toHaveLength(0);
  });

  it('shows alerts once the source is marked redistributable', async () => {
    mockAlertRepo.listActive.mockResolvedValue(
      ok({ data: [alert()], pagination: { hasNext: false, nextCursor: null } }),
    );
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: true })]])),
    );

    const result = await controller.listActive({ cursor: 100, limit: 20 }, NOW);
    const data = result._unsafeUnwrap().data;
    expect(data).toHaveLength(1);
    expect(data[0]?.provenance?.sourceKey).toBe('imd-cap-alerts');
  });

  it('resolves an area slug to an area id before filtering', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    mockAlertRepo.listActive.mockResolvedValue(
      ok({ data: [], pagination: { hasNext: false, nextCursor: null } }),
    );

    await controller.listActive({ cursor: 100, limit: 20, areaSlug: 'dehradun' }, NOW);

    expect(mockAlertRepo.listActive).toHaveBeenCalledWith(
      100,
      20,
      expect.objectContaining({ areaId: 5 }),
    );
  });

  it('propagates AREA_NOT_FOUND for an unknown area slug', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(err(ERRORS.AREA_NOT_FOUND));
    const result = await controller.listActive(
      { cursor: 100, limit: 20, areaSlug: 'nowhere' },
      NOW,
    );
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});

describe('getById', () => {
  it('returns a redistributable, unexpired alert', async () => {
    mockAlertRepo.findById.mockResolvedValue(ok(alert()));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: true })]])),
    );

    const result = await controller.getById(1, NOW);
    expect(result._unsafeUnwrap().id).toBe(1);
  });

  /** alerts.md §5 — a lapsed alert says so (410), rather than claiming it never existed. */
  it('returns ALERT_EXPIRED for a lapsed alert rather than the content', async () => {
    mockAlertRepo.findById.mockResolvedValue(ok(alert({ expiresAt: '2026-09-01 00:00:00' })));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: true })]])),
    );

    const result = await controller.getById(1, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.ALERT_EXPIRED.code);
  });

  it('treats an alert with no stated expiry as not expired', async () => {
    mockAlertRepo.findById.mockResolvedValue(ok(alert({ expiresAt: null })));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: true })]])),
    );

    const result = await controller.getById(1, NOW);
    expect(result.isOk()).toBe(true);
  });

  /** DS-6 — a non-redistributable alert is treated as not found, not partially revealed. */
  it('returns ALERT_NOT_FOUND rather than exposing a non-redistributable alert', async () => {
    mockAlertRepo.findById.mockResolvedValue(ok(alert()));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, imdSource({ mayRedistribute: false })]])),
    );

    const result = await controller.getById(1, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.ALERT_NOT_FOUND.code);
  });

  it('propagates ALERT_NOT_FOUND for an unknown id', async () => {
    mockAlertRepo.findById.mockResolvedValue(err(ERRORS.ALERT_NOT_FOUND));
    const result = await controller.getById(999, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.ALERT_NOT_FOUND.code);
  });
});

describe('getSummary', () => {
  it('counts only publicly displayable alerts by severity', async () => {
    mockAlertRepo.listActive.mockResolvedValue(
      ok({
        data: [
          alert({ id: 1, sourceId: 1, severity: AlertSeverity.Severe }),
          alert({ id: 2, sourceId: 1, severity: AlertSeverity.Moderate }),
          alert({ id: 3, sourceId: 2, severity: AlertSeverity.Extreme }),
        ],
        pagination: { hasNext: false, nextCursor: null },
      }),
    );
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(
        new Map([
          [1, imdSource({ mayRedistribute: true })],
          [2, imdSource({ key: 'other', mayRedistribute: false })],
        ]),
      ),
    );

    const result = await controller.getSummary(NOW);
    const summary = result._unsafeUnwrap();

    expect(summary.activeCount).toBe(2);
    expect(summary.bySeverity).toEqual({ severe: 1, moderate: 1 });
  });
});
