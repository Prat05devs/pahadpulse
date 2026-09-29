import { z } from 'zod';

/** The governance workspace's two dedicated endpoints. Everything else it shows is reused. */
const RankedIndicatorSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  decimals: z.number(),
  vintage: z.string(),
  value: z.number(),
  rank: z.number(),
  of: z.number(),
});

export const DistrictStandingSchema = z.object({
  districts: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      ranked: z.array(RankedIndicatorSchema),
      strengths: z.array(RankedIndicatorSchema),
      weaknesses: z.array(RankedIndicatorSchema),
    })
  ),
  used: z.array(z.object({ key: z.string(), label: z.string(), vintage: z.string() })),
  excluded: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      /** Optional during the API/frontend rolling-deploy window. */
      vintage: z.string().optional(),
      reason: z.enum(['no-direction', 'partial-coverage']),
    })
  ),
  needsAttention: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      bottomHalf: z.number(),
      of: z.number(),
      worst: z.array(RankedIndicatorSchema),
    })
  ),
});

export type DistrictStanding = z.infer<typeof DistrictStandingSchema>;
export type RankedIndicator = z.infer<typeof RankedIndicatorSchema>;

const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: z.object({ en: z.string(), hi: z.string() }),
    url: z.string().nullable(),
    attribution: z.string(),
    /** A fiscal-year label for budget rows, rather than an indicator's YYYY-MM-DD vintage. */
    vintage: z.string(),
    fetchedAt: z.string(),
    freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']),
    mayRedistribute: z.boolean(),
  })
  .nullable();

const BudgetYearSummarySchema = z.object({
  fiscalYear: z.string(),
  revenueReceipts: z.number(),
  capitalReceipts: z.number(),
  totalReceipts: z.number(),
  revenueExpenditure: z.number(),
  capitalExpenditure: z.number(),
  totalExpenditure: z.number(),
  documentUrl: z.string().url(),
  provenance: ProvenanceSchema,
});

export const BudgetReportSchema = z.object({
  fiscalYear: z.string().nullable(),
  /** Thousands of rupees, as the state publishes it. */
  total: z.number(),
  departmentTotal: z.number(),
  summary: BudgetYearSummarySchema.nullable(),
  history: z.array(BudgetYearSummarySchema),
  availableYears: z.array(z.string()),
  departments: z.array(
    z.object({
      demandNo: z.number(),
      name: z.string(),
      revenue: z.object({ voted: z.number(), charged: z.number() }),
      capital: z.object({ voted: z.number(), charged: z.number() }),
      total: z.number(),
      share: z.number(),
      provenance: ProvenanceSchema,
    })
  ),
});

export type BudgetReport = z.infer<typeof BudgetReportSchema>;
export type BudgetYearSummary = z.infer<typeof BudgetYearSummarySchema>;
