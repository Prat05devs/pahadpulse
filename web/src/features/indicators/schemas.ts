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
const UtcDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

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

const AreaIndicatorValueSchema = IndicatorValueSchema.extend({
  provenance: ProvenanceSchema,
});

/**
 * One area's indicators: the ones we have, and the ones we do not have yet.
 *
 * DEPLOY-ORDER TOLERANCE — accepts BOTH the current object and the bare array this endpoint
 * used to return.
 *
 * The web app and the API ship from the same push but deploy independently, and Vercel
 * finishes in seconds while Render rebuilds a container for minutes. This endpoint changed
 * shape rather than merely gaining a field, so for the length of that window the new
 * frontend would meet the old API's array, reject it, and take the district Statistics panel
 * and the home page's state figures down with it — the same self-inflicted outage the
 * `nationalAqi` field caused.
 *
 * An array from an old API normalises to `{ values, pending: [] }`: an empty `pending` is
 * honest there, because an API that cannot report gaps has not told us of any. Remove this
 * union once the API has been deployed for longer than a rollback would reach back.
 */
export const AreaIndicatorsSchema = z
  .union([
    z.object({
      values: z.array(AreaIndicatorValueSchema),
      /**
       * Catalogue indicators in scope for this area that have no published figure yet.
       *
       * Carried so a district page can say a number is still being compiled rather than
       * just not drawing a row — an absent row and a broken page look the same to a reader.
       * An indicator withheld under DS-6 is not in here: that figure exists and may not be
       * shown, which is a different statement from one that has not been collected.
       */
      pending: z.array(IndicatorSchema),
    }),
    z.array(AreaIndicatorValueSchema),
  ])
  .transform((parsed) => (Array.isArray(parsed) ? { values: parsed, pending: [] } : parsed));

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
