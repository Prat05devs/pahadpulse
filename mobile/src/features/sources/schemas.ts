import { z } from 'zod';

/**
 * The source registry, as the API publishes it.
 *
 * Only the fields this app shows are declared. `url` is the one that matters most: Google
 * Play's Misleading Claims policy requires an app presenting government information to link
 * to the original source, and this is where those links come from — the registry the
 * figures themselves are stamped with, so a link can never drift from the data it credits.
 */
const LocalisedTextSchema = z.object({ en: z.string(), hi: z.string() });

export const SourceSchema = z.object({
  key: z.string(),
  department: LocalisedTextSchema,
  /** The publisher's own page. Null only for a source with no public landing page. */
  url: z.string().nullable(),
  attribution: z.string(),
  licence: z.string(),
  metadataStatus: z.string(),
  lastSuccessAt: z.string().nullable(),
  lastVintage: z.string().nullable(),
});

export const SourceListSchema = z.array(SourceSchema);

export type Source = z.infer<typeof SourceSchema>;
