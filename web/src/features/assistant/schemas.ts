import { z } from 'zod';

/**
 * "Ask Pahad Pulse" at the network edge (N5). Mirrors backend/src/controllers/assistant.
 * See project/modules/assistant.md §4.5 and §5.
 */

const Needs = z.enum(['district', 'place']).nullable();

export const CatalogueSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
      questions: z.array(z.object({ id: z.string(), text: z.string(), needs: Needs })),
    })
  ),
  starters: z.array(z.string()),
  districts: z.array(z.object({ slug: z.string(), name: z.string() })),
  places: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      kind: z.string(),
      district: z.string().nullable(),
    })
  ),
});

export const AnswerSchema = z.object({
  questionId: z.string(),
  status: z.enum(['ok', 'empty', 'unavailable']),
  text: z.string(),
  facts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      vintage: z.string().nullable(),
      source: z.object({ department: z.string(), url: z.string().nullable() }).nullable(),
    })
  ),
  links: z.array(z.object({ label: z.string(), route: z.string() })),
  followUps: z.array(
    z.object({
      questionId: z.string(),
      district: z.string().nullable(),
      place: z.string().nullable(),
      text: z.string(),
    })
  ),
});

export const MatchSchema = z.object({
  outcome: z.enum(['matched', 'suggest', 'none']),
  questionId: z.string().nullable(),
  district: z.string().nullable(),
  place: z.string().nullable(),
  needs: Needs,
  suggestions: z.array(
    z.object({
      questionId: z.string(),
      text: z.string(),
      district: z.string().nullable(),
      place: z.string().nullable(),
      needs: Needs,
    })
  ),
});

export type Catalogue = z.infer<typeof CatalogueSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type Needs = z.infer<typeof Needs>;
