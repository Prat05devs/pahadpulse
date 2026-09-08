import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { Area } from '../models/area.model.js';
import type {
  AreaIndicatorValue,
  Indicator,
  RankingEntry,
  SeriesPoint,
} from '../models/indicator.model.js';
import type { Source } from '../models/source.model.js';
import type { IAreaRepository } from '../repositories/area.repository.js';
import type { IIndicatorRepository, RankingPage } from '../repositories/indicator.repository.js';
import type { ISourceRepository } from '../repositories/source.repository.js';
import { AreaType } from '../types/area.js';
import { AccessMethod, Cadence, Freshness, MetadataStatus } from '../types/dataset.js';
import { IndicatorCategory, IndicatorScope } from '../types/indicator.js';
import { ERRORS } from '../utils/errors.js';

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

const mockIndicatorRepo: jest.Mocked<IIndicatorRepository> = {
  listCatalogue: jest.fn(),
  findByKey: jest.fn(),
  latestValuesForArea: jest.fn(),
  seriesForAreaIndicator: jest.fn(),
  latestVintageFor: jest.fn(),
  latestValuesForAllAreas: jest.fn(),
  ranking: jest.fn(),
};

// provenance.service.js is exercised for real (already unit-tested in isolation); only its
// SourceRepository dependency is mocked, so these tests see genuine DS-1/DS-6 behaviour.
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

jest.unstable_mockModule('../repositories/area.repository.js', () => ({
  AreaRepository: mockAreaRepo,
}));
jest.unstable_mockModule('../repositories/indicator.repository.js', () => ({
  IndicatorRepository: mockIndicatorRepo,
}));
jest.unstable_mockModule('../repositories/source.repository.js', () => ({
  SourceRepository: mockSourceRepo,
}));

const controller = await import('./indicator.controller.js');

const NOW = new Date('2026-09-03T12:00:00.000Z');

function district(overrides: Partial<Area> = {}): Area {
  return {
    id: 1,
    type: AreaType.District,
    code: 'UK-DD',
    slug: 'dehradun',
    name: { en: 'Dehradun', hi: 'देहरादून' },
    parentId: 2,
    division: null,
    headquarters: null,
    centroid: null,
    officialIds: { lgd: null, census2011: null },
    ...overrides,
  };
}

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    key: 'population',
    category: IndicatorCategory.Demography,
    scope: IndicatorScope.District,
    label: { en: 'Population', hi: 'जनसंख्या' },
    unit: 'count',
    decimals: 0,
    higherIsBetter: null,
    ...overrides,
  };
}

function redistributableSource(overrides: Partial<Source> = {}): Source {
  return {
    key: 'pahad-pulse-demo-data',
    ownerModule: 'indicators',
    department: { en: 'Demo', hi: 'डेमो' },
    url: 'urn:demo',
    attribution: 'DEMO DATA',
    licence: 'Internal',
    accessMethod: AccessMethod.Manual,
    cadence: Cadence.Static,
    mayRedistribute: true,
    metadataStatus: MetadataStatus.Provisional,
    freshness: Freshness.Fresh,
    lastSuccessAt: '2026-09-03 10:00:00',
    lastVintage: '2023-04-01',
    lastRunStatus: null,
    lastRunAt: null,
    ...overrides,
  };
}

function areaValue(overrides: Partial<AreaIndicatorValue> = {}): AreaIndicatorValue {
  return {
    indicator: indicator(),
    value: 1_000_000,
    vintage: '2023-04-01',
    sourceId: 1,
    fetchedAt: '2026-09-03 10:00:00',
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockAreaRepo)) fn.mockReset();
  for (const fn of Object.values(mockIndicatorRepo)) fn.mockReset();
  for (const fn of Object.values(mockSourceRepo)) fn.mockReset();
  mockSourceRepo.findByIds.mockResolvedValue(ok(new Map([[1, redistributableSource()]])));
  // Most tests here are about values, not gaps; an empty catalogue means no indicator is
  // reported pending unless a test says so.
  mockIndicatorRepo.listCatalogue.mockResolvedValue(ok([]));
});

describe('getAreaIndicators', () => {
  it('resolves the area, attaches provenance, and returns the values', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    mockIndicatorRepo.latestValuesForArea.mockResolvedValue(ok([areaValue()]));

    const result = await controller.getAreaIndicators('dehradun', NOW);

    expect(result.isOk()).toBe(true);
    const { values } = result._unsafeUnwrap();
    expect(values).toHaveLength(1);
    expect(values[0]?.provenance?.sourceKey).toBe('pahad-pulse-demo-data');
  });

  /**
   * A district page must be able to say a figure is still being compiled. An absent row and
   * a broken page look the same to a reader, so the gap is reported rather than left silent.
   */
  it('reports in-scope catalogue indicators that have no value', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    mockIndicatorRepo.latestValuesForArea.mockResolvedValue(ok([areaValue()]));
    mockIndicatorRepo.listCatalogue.mockResolvedValue(
      ok([
        indicator(),
        indicator({ key: 'schools_count', scope: IndicatorScope.District }),
        // Out of scope for a district, so it is not a gap in this district's page.
        indicator({ key: 'state_population', scope: IndicatorScope.State }),
      ]),
    );

    const { pending } = (await controller.getAreaIndicators('dehradun', NOW))._unsafeUnwrap();
    expect(pending.map((entry) => entry.key)).toEqual(['schools_count']);
  });

  /**
   * DS-6 drops a value we HOLD. That is not the same as not having it, and promising it is
   * "coming soon" would promise a figure that will never arrive.
   */
  it('does not call a redistribution-blocked indicator pending', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    mockIndicatorRepo.latestValuesForArea.mockResolvedValue(ok([areaValue()]));
    mockIndicatorRepo.listCatalogue.mockResolvedValue(ok([indicator()]));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, redistributableSource({ mayRedistribute: false })]])),
    );

    const result = (await controller.getAreaIndicators('dehradun', NOW))._unsafeUnwrap();
    expect(result.values).toHaveLength(0);
    expect(result.pending).toHaveLength(0);
  });

  /** DS-6 — a value whose source may not be redistributed is dropped, not just hidden. */
  it('drops values from a non-redistributable source', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    mockIndicatorRepo.latestValuesForArea.mockResolvedValue(ok([areaValue()]));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, redistributableSource({ mayRedistribute: false })]])),
    );

    const result = await controller.getAreaIndicators('dehradun', NOW);
    expect(result._unsafeUnwrap().values).toHaveLength(0);
  });

  it('propagates AREA_NOT_FOUND without re-wrapping', async () => {
    mockAreaRepo.findBySlug.mockResolvedValue(err(ERRORS.AREA_NOT_FOUND));
    const result = await controller.getAreaIndicators('nowhere', NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});

describe('compareAreas', () => {
  it('rejects comparing an area to itself', async () => {
    const result = await controller.compareAreas('dehradun', 'dehradun', undefined, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.COMPARISON_REQUIRES_TWO_AREAS.code);
    expect(mockAreaRepo.findBySlug).not.toHaveBeenCalled();
  });

  /** IND-4 — comparison is only permitted between areas of the same type. */
  it('rejects comparing areas of different types', async () => {
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ slug: 'dehradun' })));
    mockAreaRepo.findBySlug.mockResolvedValueOnce(
      ok(district({ id: 99, type: AreaType.State, slug: 'uttarakhand' })),
    );

    const result = await controller.compareAreas('dehradun', 'uttarakhand', undefined, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.COMPARISON_AREA_TYPE_MISMATCH.code);
  });

  /** IND-5 — a row appears only when both areas have a value; the rest are counted, not shown. */
  it('omits indicators present on only one side and reports the count', async () => {
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ id: 1, slug: 'dehradun' })));
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ id: 2, slug: 'nainital' })));

    mockIndicatorRepo.latestValuesForArea.mockImplementation((areaId: number) => {
      if (areaId === 1) {
        return Promise.resolve(
          ok([
            areaValue({ indicator: indicator({ key: 'population' }), sourceId: 1 }),
            areaValue({ indicator: indicator({ key: 'literacy_rate' }), sourceId: 1 }),
          ]),
        );
      }
      return Promise.resolve(
        ok([areaValue({ indicator: indicator({ key: 'population' }), sourceId: 1 })]),
      );
    });

    const result = await controller.compareAreas('dehradun', 'nainital', undefined, NOW);
    const comparison = result._unsafeUnwrap();

    expect(comparison.rows).toHaveLength(1);
    expect(comparison.rows[0]?.indicator.key).toBe('population');
    expect(comparison.omittedCount).toBe(1);
  });

  it('filters by category when categories are given', async () => {
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ id: 1, slug: 'dehradun' })));
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ id: 2, slug: 'nainital' })));

    const both: AreaIndicatorValue[] = [
      areaValue({
        indicator: indicator({ key: 'population', category: IndicatorCategory.Demography }),
      }),
      areaValue({
        indicator: indicator({ key: 'per_capita_income', category: IndicatorCategory.Economy }),
      }),
    ];
    mockIndicatorRepo.latestValuesForArea.mockResolvedValue(ok(both));

    const result = await controller.compareAreas('dehradun', 'nainital', ['economy'], NOW);
    const comparison = result._unsafeUnwrap();

    expect(comparison.rows).toHaveLength(1);
    expect(comparison.rows[0]?.indicator.key).toBe('per_capita_income');
  });

  it('propagates AREA_NOT_FOUND for the second slug', async () => {
    mockAreaRepo.findBySlug.mockResolvedValueOnce(ok(district({ slug: 'dehradun' })));
    mockAreaRepo.findBySlug.mockResolvedValueOnce(err(ERRORS.AREA_NOT_FOUND));

    const result = await controller.compareAreas('dehradun', 'atlantis', undefined, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});

describe('getSeries', () => {
  it('returns provenance-stamped points ordered by vintage', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(
      ok(indicator({ scope: IndicatorScope.District })),
    );
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district()));
    const points: SeriesPoint[] = [
      { value: 1, vintage: '2015-04-01', sourceId: 1, fetchedAt: '2026-09-03 10:00:00' },
      { value: 2, vintage: '2019-04-01', sourceId: 1, fetchedAt: '2026-09-03 10:00:00' },
    ];
    mockIndicatorRepo.seriesForAreaIndicator.mockResolvedValue(ok(points));

    const result = await controller.getSeries('population', 'dehradun', NOW);
    expect(result._unsafeUnwrap()).toHaveLength(2);
  });

  it('rejects a scope mismatch between the indicator and the resolved area', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(ok(indicator({ scope: IndicatorScope.Village })));
    mockAreaRepo.findBySlug.mockResolvedValue(ok(district({ type: AreaType.District })));

    const result = await controller.getSeries('population', 'dehradun', NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.INDICATOR_SCOPE_NOT_SUPPORTED.code);
    expect(mockIndicatorRepo.seriesForAreaIndicator).not.toHaveBeenCalled();
  });

  it('propagates INDICATOR_NOT_FOUND', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(err(ERRORS.INDICATOR_NOT_FOUND));
    const result = await controller.getSeries('not-a-key', 'dehradun', NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.INDICATOR_NOT_FOUND.code);
  });
});

describe('getRanking', () => {
  const emptyPage: RankingPage = { data: [], pagination: { hasNext: false, nextCursor: null } };

  it('resolves the latest vintage when none is given', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(ok(indicator()));
    mockIndicatorRepo.latestVintageFor.mockResolvedValue(ok('2023-04-01'));
    mockIndicatorRepo.ranking.mockResolvedValue(ok(emptyPage));

    const result = await controller.getRanking('population', undefined, 0, 20, NOW);

    expect(result._unsafeUnwrap().vintage).toBe('2023-04-01');
    expect(mockIndicatorRepo.ranking).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'population' }),
      '2023-04-01',
      { cursor: 0, limit: 20 },
    );
  });

  it('uses an explicit vintage without consulting latestVintageFor', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(ok(indicator()));
    mockIndicatorRepo.ranking.mockResolvedValue(ok(emptyPage));

    await controller.getRanking('population', '2019-04-01', 0, 20, NOW);

    expect(mockIndicatorRepo.latestVintageFor).not.toHaveBeenCalled();
    expect(mockIndicatorRepo.ranking).toHaveBeenCalledWith(expect.anything(), '2019-04-01', {
      cursor: 0,
      limit: 20,
    });
  });

  /** IND-6 — ranking cannot proceed with no vintage to anchor on. */
  it('fails when the indicator has never had a value at all', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(ok(indicator()));
    mockIndicatorRepo.latestVintageFor.mockResolvedValue(ok(null));

    const result = await controller.getRanking('population', undefined, 0, 20, NOW);
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.INDICATOR_VALUE_NOT_AVAILABLE.code);
    expect(mockIndicatorRepo.ranking).not.toHaveBeenCalled();
  });

  it('passes through pagination and stamps entries with provenance', async () => {
    mockIndicatorRepo.findByKey.mockResolvedValue(ok(indicator()));
    const entries: RankingEntry[] = [
      {
        rank: 1,
        value: 5,
        vintage: '2023-04-01',
        sourceId: 1,
        fetchedAt: '2026-09-03 10:00:00',
        area: { id: 1, slug: 'dehradun', name: { en: 'Dehradun', hi: 'देहरादून' } },
      },
    ];
    mockIndicatorRepo.ranking.mockResolvedValue(
      ok({ data: entries, pagination: { hasNext: true, nextCursor: 1 } }),
    );

    const result = await controller.getRanking('population', '2023-04-01', 0, 1, NOW);
    const ranking = result._unsafeUnwrap();

    expect(ranking.pagination).toEqual({ hasNext: true, nextCursor: 1 });
    expect(ranking.data[0]?.provenance?.sourceKey).toBe('pahad-pulse-demo-data');
  });
});
