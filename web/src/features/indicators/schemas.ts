import { z } from 'zod';

export const IndicatorSchema = z.object({
  key: z.string(),
  category: z.string(),
  label: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  unit: z.string(),
  decimals: z.number(),
  higherIsBetter: z.boolean().nullable(),
  scope: z.enum(['state', 'district', 'village']),
});

export type Indicator = z.infer<typeof IndicatorSchema>;

/**
 * Matches the API contract exactly, verified against a live response.
 *
 * This schema previously described a shape the API has never returned — `indicatorKey` and
 * `areaId` at the top level, a numeric `vintage`, ISO-8601 timestamps. The parse failed on
 * every request, the district page swallowed the failure with `.catch(() => null)`, and the
 * statistics section silently never rendered. Two rules exist to catch exactly this: validate
 * at the boundary (N5), and never let a caught error become an empty screen with no signal.
 *
 * Dates are the API's own format, not ISO: `vintage` is `YYYY-MM-DD` (the date the figure
 * DESCRIBES) and `fetchedAt` is `YYYY-MM-DD HH:mm:ss` UTC (when it was retrieved). Keeping
 * these distinct is the platform's core provenance promise, so they are typed separately
 * rather than collapsed into one "date" field.
 */
const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const UtcDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

export const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: z.object({ en: z.string(), hi: z.string() }),
    url: z.string().nullable(),
    attribution: z.string(),
    vintage: DateOnly,
    fetchedAt: UtcDateTime,
    freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']),
    mayRedistribute: z.boolean(),
  })
  .nullable();

export const IndicatorValueSchema = z.object({
  indicator: IndicatorSchema,
  value: z.number(),
  vintage: DateOnly,
  sourceId: z.number(),
  fetchedAt: UtcDateTime,
});

export type IndicatorValue = z.infer<typeof IndicatorValueSchema>;

export const AreaIndicatorsSchema = z.array(
  IndicatorValueSchema.extend({
    provenance: ProvenanceSchema,
  })
);

const ComparedValueSchema = IndicatorValueSchema.extend({
  provenance: ProvenanceSchema,
});

/**
 * One indicator measured for both districts.
 *
 * `areaA` / `areaB` are nullable independently: a district can have a published figure where
 * the other does not, and the row must still render rather than be dropped — "no comparable
 * figure" is itself a fact about the data worth showing.
 */
export const ComparisonRowSchema = z.object({
  indicator: IndicatorSchema,
  areaA: ComparedValueSchema.nullable(),
  areaB: ComparedValueSchema.nullable(),
});

export const ComparisonSchema = z.object({
  rows: z.array(ComparisonRowSchema),
  /** Indicators skipped because neither district has a value for them. */
  omittedCount: z.number(),
});

export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;
export type Comparison = z.infer<typeof ComparisonSchema>;

export type AreaIndicators = z.infer<typeof AreaIndicatorsSchema>;
