import { z } from 'zod';

const LocalisedTextSchema = z.object({ en: z.string(), hi: z.string() });

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const UtcDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: LocalisedTextSchema,
    url: z.string().nullable(),
    attribution: z.string(),
    vintage: DateOnly,
    fetchedAt: UtcDateTime,
    freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']),
    mayRedistribute: z.boolean(),
  })
  .nullable();

/**
 * How a district's data stands. Parsed as an enum rather than a boolean because "we have
 * not published this yet" and "this district has only one of the two rounds" are different
 * things to tell a reader, and a boolean would collapse them.
 */
export const CoverageSchema = z.enum(['covered', 'partial', 'not_yet_available']);

export const MigrationSurveySchema = z.object({
  key: z.string(),
  label: LocalisedTextSchema,
  coversFrom: DateOnly,
  coversTo: DateOnly,
  publishedOn: DateOnly,
  gramPanchayatsSurveyed: z.number().nullable(),
  blocksSurveyed: z.number().nullable(),
  evidenceUrl: z.string(),
  sourceId: z.number(),
  vintage: DateOnly,
  fetchedAt: UtcDateTime,
  provenance: ProvenanceSchema,
});

export const MigrationFiguresSchema = z.object({
  surveyKey: z.string(),
  temporaryPersons: z.number(),
  temporaryPanchayats: z.number(),
  permanentPersons: z.number(),
  permanentPanchayats: z.number(),
  blocksReporting: z.number().nullable(),
});

export const MigrationChangeSchema = z
  .object({
    temporaryPersons: z.number(),
    permanentPersons: z.number(),
    temporaryPanchayats: z.number(),
    permanentPanchayats: z.number(),
  })
  .nullable();

export const MigrationBreakdownSchema = z.object({
  dimension: z.enum(['reason', 'age', 'destination', 'occupation', 'village_condition']),
  isShare: z.boolean(),
  values: z.array(
    z.object({
      categoryKey: z.string(),
      label: LocalisedTextSchema,
      note: z.string().nullable(),
      value: z.number(),
    }),
  ),
});

export const AreaMigrationSchema = z.object({
  coverage: CoverageSchema,
  coverageNote: z.string().nullable(),
  rounds: z.array(
    z.object({
      survey: MigrationSurveySchema,
      figures: MigrationFiguresSchema,
      breakdowns: z.array(MigrationBreakdownSchema),
    }),
  ),
  change: MigrationChangeSchema,
});

export const StateMigrationSchema = z.object({
  surveys: z.array(MigrationSurveySchema),
  districts: z.array(
    z.object({
      slug: z.string(),
      name: z.object({ en: z.string(), hi: z.string().nullable() }),
      coverage: CoverageSchema,
      figures: z.array(MigrationFiguresSchema),
      change: MigrationChangeSchema,
    }),
  ),
  totals: z.array(
    z.object({
      surveyKey: z.string(),
      temporaryPersons: z.number(),
      permanentPersons: z.number(),
    }),
  ),
});

export type Coverage = z.infer<typeof CoverageSchema>;
export type MigrationBreakdown = z.infer<typeof MigrationBreakdownSchema>;
export type StateMigration = z.infer<typeof StateMigrationSchema>;
export type AreaMigration = z.infer<typeof AreaMigrationSchema>;
