import { z } from 'zod';

/**
 * The source registry, as the API publishes it.
 *
 * Only the fields the sources page shows. `url` is the important one: a product that
 * presents government information has to link to the department that published it, and
 * these links come from the same registry the figures are stamped with, so a link cannot
 * drift from the data it credits.
 */
const LocalisedTextSchema = z.object({ en: z.string(), hi: z.string() });

export const SourceSchema = z.object({
  key: z.string(),
  ownerModule: z.string(),
  department: LocalisedTextSchema,
  url: z.string().nullable(),
  attribution: z.string(),
  licence: z.string(),
  accessMethod: z.string(),
  cadence: z.string(),
  mayRedistribute: z.boolean(),
  metadataStatus: z.string(),
  freshness: z.string(),
  lastSuccessAt: z.string().nullable(),
  lastVintage: z.string().nullable(),
});

export const SourceListSchema = z.array(SourceSchema);

export type Source = z.infer<typeof SourceSchema>;
