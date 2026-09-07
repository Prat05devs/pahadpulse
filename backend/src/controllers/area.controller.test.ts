import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { Area, AreaBoundary, DistrictSummary } from '../models/area.model.js';
import type { IAreaRepository } from '../repositories/area.repository.js';
import { AreaType, Division } from '../types/area.js';
import { ERRORS } from '../utils/errors.js';

const mockRepo: jest.Mocked<IAreaRepository> = {
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

jest.unstable_mockModule('../repositories/area.repository.js', () => ({
  AreaRepository: mockRepo,
}));

const controller = await import('./area.controller.js');

const dehradun: Area = {
  id: 5,
  type: AreaType.District,
  code: 'UK-DD',
  slug: 'dehradun',
  name: { en: 'Dehradun', hi: 'देहरादून' },
  parentId: 1,
  division: Division.Garhwal,
  headquarters: { en: 'Dehradun', hi: 'देहरादून' },
  centroid: { lat: 30.3165, lng: 78.0322 },
  officialIds: { lgd: null, census2011: null },
};

const boundary: AreaBoundary = {
  areaId: 5,
  geojson: { type: 'Polygon', coordinates: [] },
  isPlaceholder: true,
  sourceNote: 'placeholder',
  updatedAt: '2026-09-03 00:00:00',
};

beforeEach(() => {
  for (const fn of Object.values(mockRepo)) fn.mockReset();
  // Villages are an enrichment on the district detail, not a precondition. Defaulting to an
  // empty map keeps these tests about the district/tehsil/boundary assembly they cover.
  mockRepo.listVillagesByTehsil.mockResolvedValue(ok(new Map<number, string[]>()));
});

describe('getAreaBySlug', () => {
  it('returns the area for an addressable type', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok(dehradun));
    const result = await controller.getAreaBySlug('dehradun');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().slug).toBe('dehradun');
  });

  it('rejects a village slug with AREA_TYPE_NOT_SUPPORTED', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok({ ...dehradun, type: AreaType.Village }));
    const result = await controller.getAreaBySlug('some-village');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_TYPE_NOT_SUPPORTED.code);
  });

  it('propagates AREA_NOT_FOUND without re-wrapping', async () => {
    mockRepo.findBySlug.mockResolvedValue(err(ERRORS.AREA_NOT_FOUND));
    const result = await controller.getAreaBySlug('nowhere');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});

describe('getDistrictDetail', () => {
  it('assembles district, tehsils and boundary', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok(dehradun));
    mockRepo.listChildren.mockResolvedValue(ok([]));
    mockRepo.findBoundaryByAreaId.mockResolvedValue(ok(boundary));

    const result = await controller.getDistrictDetail('dehradun');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().boundary?.isPlaceholder).toBe(true);
  });

  /** geography.md §7 — a missing boundary degrades the map, it does not fail the page. */
  it('returns a null boundary rather than failing when none exists', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok(dehradun));
    mockRepo.listChildren.mockResolvedValue(ok([]));
    mockRepo.findBoundaryByAreaId.mockResolvedValue(err(ERRORS.BOUNDARY_NOT_AVAILABLE));

    const result = await controller.getDistrictDetail('dehradun');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().boundary).toBeNull();
  });

  it('still fails on a database error while loading the boundary', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok(dehradun));
    mockRepo.listChildren.mockResolvedValue(ok([]));
    mockRepo.findBoundaryByAreaId.mockResolvedValue(err(ERRORS.DATABASE_ERROR));

    const result = await controller.getDistrictDetail('dehradun');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.DATABASE_ERROR.code);
  });

  it('rejects a non-district slug', async () => {
    mockRepo.findBySlug.mockResolvedValue(ok({ ...dehradun, type: AreaType.State }));
    const result = await controller.getDistrictDetail('uttarakhand');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_TYPE_NOT_SUPPORTED.code);
  });
});

describe('listDistricts', () => {
  it('passes the repository result through', async () => {
    const summaries: DistrictSummary[] = [
      { ...dehradun, counts: { tehsils: 3, villages: 12 }, hasBoundary: true },
    ];
    mockRepo.listDistricts.mockResolvedValue(ok(summaries));
    const result = await controller.listDistricts();
    expect(result._unsafeUnwrap()).toHaveLength(1);
  });
});
