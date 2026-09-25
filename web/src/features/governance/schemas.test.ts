import { describe, expect, it } from 'vitest';

import { BudgetReportSchema } from './schemas';

const API_BUDGET = {
  fiscalYear: '2026-27',
  total: 1_117_032_109,
  departmentTotal: 1_117_032_109,
  availableYears: ['2026-27'],
  summary: {
    fiscalYear: '2026-27',
    revenueReceipts: 675_257_700,
    capitalReceipts: 426_173_500,
    totalReceipts: 1_101_431_200,
    revenueExpenditure: 649_894_400,
    capitalExpenditure: 467_137_700,
    totalExpenditure: 1_117_032_100,
    documentUrl: 'https://budget.uk.gov.in/files/2026-27.pdf',
    provenance: {
      sourceKey: 'uk-budget-directorate',
      department: { en: 'Budget Directorate', hi: 'बजट निदेशालय' },
      url: 'https://budget.uk.gov.in/budgets/',
      attribution: 'Source: Budget at a Glance archive',
      vintage: '2026-27',
      fetchedAt: '2026-09-24 10:00:00',
      freshness: 'fresh',
      mayRedistribute: true,
    },
  },
  history: [
    {
      fiscalYear: '2026-27',
      revenueReceipts: 675_257_700,
      capitalReceipts: 426_173_500,
      totalReceipts: 1_101_431_200,
      revenueExpenditure: 649_894_400,
      capitalExpenditure: 467_137_700,
      totalExpenditure: 1_117_032_100,
      documentUrl: 'https://budget.uk.gov.in/files/2026-27.pdf',
      provenance: {
        sourceKey: 'uk-budget-directorate',
        department: { en: 'Budget Directorate', hi: 'बजट निदेशालय' },
        url: 'https://budget.uk.gov.in/budgets/',
        attribution: 'Source: Budget at a Glance archive',
        vintage: '2026-27',
        fetchedAt: '2026-09-24 10:00:00',
        freshness: 'fresh',
        mayRedistribute: true,
      },
    },
  ],
  departments: [
    {
      demandNo: 11,
      fiscalYear: '2026-27',
      name: 'Education, Sports, Youth Welfare and Culture',
      revenue: { voted: 118_719_103, charged: 0 },
      capital: { voted: 7_886_919, charged: 0 },
      total: 126_606_022,
      sourceId: 20,
      fetchedAt: '2026-09-24 10:00:00',
      share: 11.33,
      provenance: {
        sourceKey: 'uk-budget-directorate',
        department: {
          en: 'Budget Directorate, Finance Department, Government of Uttarakhand',
          hi: 'बजट निदेशालय, वित्त विभाग, उत्तराखण्ड सरकार',
        },
        url: 'https://budget.uk.gov.in/budget-2026-27/',
        attribution: 'Source: Budget at a Glance 2026-27',
        vintage: '2026-27',
        fetchedAt: '2026-09-24 10:00:00',
        freshness: 'fresh',
        mayRedistribute: true,
      },
    },
  ],
};

describe('BudgetReportSchema', () => {
  it('accepts the API budget contract, including a fiscal-year provenance vintage', () => {
    const result = BudgetReportSchema.parse(API_BUDGET);

    expect(result.departments[0]?.provenance?.vintage).toBe('2026-27');
    expect(result.departments[0]?.provenance?.mayRedistribute).toBe(true);
  });

  it('rejects a row without the provenance fields used by the source contract', () => {
    const invalid = structuredClone(API_BUDGET);
    delete (invalid.departments[0]?.provenance as Partial<{ fetchedAt: string }>).fetchedAt;

    expect(() => BudgetReportSchema.parse(invalid)).toThrow();
  });
});
