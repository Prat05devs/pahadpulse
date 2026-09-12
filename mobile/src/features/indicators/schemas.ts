import { z } from 'zod';

import { DateOnly, LocalisedTextSchema, ProvenanceSchema, UtcDateTime } from '@/types/api';

/**
 * Statistical indicators: census figures, health, education, connectivity, migration.
 *
 * `vintage` is the date the figure DESCRIBES and `fetchedAt` is when we retrieved it. Those
 * are different facts and are typed differently on purpose — collapsing them into one "date"
 * is what makes a 2011 census figure look like it was measured this morning.
 */

export const IndicatorSchema = z.object({
  key: z.string(),
  category: z.string(),
  label: LocalisedTextSchema,
  unit: z.string(),
  decimals: z.number(),
  /** Null where "higher" is neither good nor bad, such as a population count. */
  higherIsBetter: z.boolean().nullable(),
  scope: z.enum(['state', 'district', 'village']),
});

export type Indicator = z.infer<typeof IndicatorSchema>;

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

export type AreaIndicatorValue = z.infer<typeof AreaIndicatorValueSchema>;

/**
 * One area's indicators: what we have, and what we know we do not have yet.
 *
 * Accepts BOTH the current object and the bare array this endpoint used to return. On mobile
 * that tolerance matters more than it does on the web: an install stays on a reader's phone
 * for months, so a version of this app will be meeting whatever the API becomes long after
 * this file was written. Accepting the older shape costs one union and removes a whole class
 * of "the app broke after the backend deployed" report.
 */
export const AreaIndicatorsSchema = z
  .union([
    z.object({
      values: z.array(AreaIndicatorValueSchema),
      /**
       * Catalogue indicators in scope for this area with no published figure yet. Carried so
       * a screen can say a number is still being compiled, rather than just omitting the row
       * — an absent row and a broken screen look identical to a reader.
       */
      pending: z.array(IndicatorSchema),
    }),
    z.array(AreaIndicatorValueSchema),
  ])
  .transform((parsed) => (Array.isArray(parsed) ? { values: parsed, pending: [] } : parsed));

export type AreaIndicators = z.infer<typeof AreaIndicatorsSchema>;
