import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok } from 'neverthrow';

import type { BudgetYearSummary, DepartmentBudget } from '../models/budget.model.js';
import type { Source } from '../models/source.model.js';
import type { IGovernanceRepository } from '../repositories/governance.repository.js';
import type { ISourceRepository } from '../repositories/source.repository.js';
import { AccessMethod, Cadence, Freshness, MetadataStatus } from '../types/dataset.js';

const mockGovernanceRepo: jest.Mocked<IGovernanceRepository> = {
  listDepartmentBudgets: jest.fn(),
  listBudgetSummaries: jest.fn(),
  listBudgetYears: jest.fn(),
  districtIndicatorSeries: jest.fn(),
  listDistricts: jest.fn(),
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

jest.unstable_mockModule('../repositories/governance.repository.js', () => ({
  GovernanceRepository: mockGovernanceRepo,
}));
jest.unstable_mockModule('../repositories/source.repository.js', () => ({
  SourceRepository: mockSourceRepo,
}));

const controller = await import('./governance.controller.js');
const NOW = new Date('2026-09-24T12:00:00.000Z');

function department(overrides: Partial<DepartmentBudget> = {}): DepartmentBudget {
  return {
    demandNo: 11,
    fiscalYear: '2026-27',
    name: 'Education',
    revenue: { voted: 80_000, charged: 0 },
    capital: { voted: 20_000, charged: 0 },
    total: 100_000,
    sourceId: 1,
    fetchedAt: '2026-09-24 10:00:00',
    ...overrides,
  };
}

function summary(overrides: Partial<BudgetYearSummary> = {}): BudgetYearSummary {
  return {
    fiscalYear: '2026-27',
    revenueReceipts: 675_257_700,
    capitalReceipts: 426_173_500,
    totalReceipts: 1_101_431_200,
    revenueExpenditure: 649_894_400,
    capitalExpenditure: 467_137_700,
    totalExpenditure: 1_117_032_100,
    documentUrl: 'https://budget.uk.gov.in/files/2026-27.pdf',
    sourceId: 1,
    fetchedAt: '2026-09-24 10:00:00',
    ...overrides,
  };
}

function source(overrides: Partial<Source> = {}): Source {
  return {
    key: 'uk-budget-directorate',
    ownerModule: 'governance',
    department: { en: 'Budget Directorate', hi: 'बजट निदेशालय' },
    url: 'https://budget.uk.gov.in/budget-2026-27/',
    attribution: 'Source: Budget at a Glance 2026-27',
    licence: 'Government publication',
    accessMethod: AccessMethod.Manual,
    cadence: Cadence.Annual,
    mayRedistribute: true,
    metadataStatus: MetadataStatus.Provisional,
    freshness: Freshness.Fresh,
    lastSuccessAt: null,
    lastVintage: null,
    lastRunStatus: null,
    lastRunAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockGovernanceRepo)) fn.mockReset();
  for (const fn of Object.values(mockSourceRepo)) fn.mockReset();
  mockSourceRepo.findByIds.mockResolvedValue(ok(new Map([[1, source()]])));
  mockGovernanceRepo.listBudgetSummaries.mockResolvedValue(ok([summary()]));
});

describe('getBudget', () => {
  it('computes department shares from the redistributable rows returned', async () => {
    mockGovernanceRepo.listDepartmentBudgets.mockResolvedValue(
      ok([department(), department({ demandNo: 12, name: 'Health', total: 50_000 })]),
    );

    const report = (await controller.getBudget('2026-27', NOW))._unsafeUnwrap();

    expect(report.total).toBe(1_117_032_100);
    expect(report.departmentTotal).toBe(150_000);
    expect(report.departments.map((item) => item.share)).toEqual([66.67, 33.33]);
    expect(report.availableYears).toEqual(['2026-27']);
    expect(report.departments[0]?.provenance?.sourceKey).toBe('uk-budget-directorate');
  });

  it('does not expose rows whose source is not cleared for redistribution', async () => {
    mockGovernanceRepo.listDepartmentBudgets.mockResolvedValue(ok([department()]));
    mockSourceRepo.findByIds.mockResolvedValue(
      ok(new Map([[1, source({ mayRedistribute: false })]])),
    );

    const report = (await controller.getBudget('2026-27', NOW))._unsafeUnwrap();

    expect(report.total).toBe(0);
    expect(report.history).toEqual([]);
    expect(report.departments).toEqual([]);
  });
});

describe('getDistrictStanding', () => {
  it('returns profiles and orders the district with more lower-half placements first', async () => {
    mockGovernanceRepo.listDistricts.mockResolvedValue(
      ok([
        { slug: 'alpha', name: 'Alpha' },
        { slug: 'beta', name: 'Beta' },
      ]),
    );
    mockGovernanceRepo.districtIndicatorSeries.mockResolvedValue(
      ok([
        {
          key: 'literacy_rate',
          label: 'Literacy Rate',
          unit: 'percent',
          decimals: 1,
          higherIsBetter: true,
          vintage: '2011-03-01',
          values: [
            { slug: 'alpha', name: 'Alpha', value: 90 },
            { slug: 'beta', name: 'Beta', value: 70 },
          ],
        },
      ]),
    );

    const report = (await controller.getDistrictStanding())._unsafeUnwrap();

    expect(report.needsAttention[0]).toMatchObject({ slug: 'beta', bottomHalf: 1, of: 1 });
    expect(report.used[0]?.vintage).toBe('2011-03-01');
  });
});

describe('listBudgetYears', () => {
  it('delegates to the repository without reordering the result', async () => {
    mockGovernanceRepo.listBudgetYears.mockResolvedValue(ok(['2026-27', '2025-26']));

    expect((await controller.listBudgetYears())._unsafeUnwrap()).toEqual(['2026-27', '2025-26']);
  });
});
