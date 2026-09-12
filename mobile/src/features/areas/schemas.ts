import { z } from 'zod';

import { CentroidSchema, LocalisedTextSchema } from '@/types/api';

/**
 * Geography: districts, tehsils, villages.
 *
 * Kept byte-identical in shape to `web/src/features/dashboard/schemas.ts`. When the API
 * changes, both files change in the same commit — a schema that has drifted between web and
 * mobile means one of the two clients is silently rejecting valid data.
 */

export const AreaSchema = z.object({
  id: z.number(),
  type: z.enum(['state', 'district', 'tehsil', 'village']),
  code: z.string(),
  slug: z.string(),
  name: LocalisedTextSchema,
  parentId: z.number().nullable(),
  division: z.string().nullable(),
  headquarters: LocalisedTextSchema.nullable(),
  centroid: CentroidSchema.nullable(),
  officialIds: z.object({
    lgd: z.string().nullable(),
    census2011: z.string().nullable(),
  }),
});

export type Area = z.infer<typeof AreaSchema>;

/** A district as it appears in the list: the area plus how much sits under it. */
export const DistrictSummarySchema = AreaSchema.extend({
  counts: z.object({
    tehsils: z.number(),
    villages: z.number(),
  }),
  hasBoundary: z.boolean(),
});

export type DistrictSummary = z.infer<typeof DistrictSummarySchema>;

export const DistrictSummaryListSchema = z.array(DistrictSummarySchema);

const TehsilSchema = AreaSchema.extend({
  villages: z.array(z.string()),
});

export type Tehsil = z.infer<typeof TehsilSchema>;

/**
 * One district in full.
 *
 * `boundary` is nullable rather than required: a district whose polygon has not been
 * ingested still has tehsils, statistics and alerts worth showing, so a missing shape
 * degrades the map instead of failing the screen.
 */
export const DistrictDetailSchema = z.object({
  district: AreaSchema,
  tehsils: z.array(TehsilSchema),
  boundary: z
    .object({
      areaId: z.number(),
      geometry: z.unknown(),
      simplified: z.unknown().nullable().optional(),
    })
    .nullable(),
});

export type DistrictDetail = z.infer<typeof DistrictDetailSchema>;
