import { z } from 'zod';

/**
 * Shapes shared by every endpoint. Kept identical to the matching schema files under
 * `web/src/features`, so a schema can be copied between the two apps without editing — a
 * divergence here means the two clients disagree about what the API said, which is the
 * worst kind of bug to chase.
 */

/** Every human-readable string from the API arrives in both languages. */
export const LocalisedTextSchema = z.object({
  en: z.string(),
  hi: z.string(),
});

export type LocalisedText = z.infer<typeof LocalisedTextSchema>;

/**
 * The API's date formats, which are NOT ISO-8601.
 *
 * `DateOnly` is the date a figure DESCRIBES (a census year, a survey round).
 * `UtcDateTime` is when it was RETRIEVED, as `YYYY-MM-DD HH:mm:ss` in UTC.
 *
 * Typing either as `z.string().datetime()` makes every response fail validation. The web app
 * shipped that bug and the district statistics panel silently rendered nothing for weeks.
 */
export const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const UtcDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

/** How current a figure is, as judged by the API against the source's own refresh cadence. */
export const FreshnessSchema = z.enum(['fresh', 'stale', 'expired', 'unknown']);

export type Freshness = z.infer<typeof FreshnessSchema>;

/**
 * Where a number came from. The platform does not author data, so this travels with every
 * figure and is rendered next to it rather than tucked into an "about" screen.
 */
export const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: LocalisedTextSchema,
    url: z.string().nullable(),
    attribution: z.string(),
    vintage: z.string(),
    fetchedAt: UtcDateTime,
    freshness: FreshnessSchema,
    /**
     * Some sources permit display but not redistribution. When false the figure may be
     * shown in the app but must not be exported, shared or cached for offline reuse.
     */
    mayRedistribute: z.boolean(),
  })
  .nullable();

export type Provenance = z.infer<typeof ProvenanceSchema>;

export const CentroidSchema = z.object({ lat: z.number(), lng: z.number() });

export type Centroid = z.infer<typeof CentroidSchema>;

/** Cursor pagination, as returned alongside `data` in the envelope. */
export const PaginationSchema = z.object({
  nextCursor: z.number().nullable().optional(),
  hasMore: z.boolean().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;
