import { z } from 'zod';

/**
 * The map's boundary at the network edge (N5). Geometry arriving from the API is validated
 * structurally rather than trusted — a malformed coordinate array is the kind of thing that
 * throws deep inside the renderer, far from the cause.
 *
 * Mirrors `web/src/features/map/schemas.ts` because both clients read the same two
 * endpoints. Kept as its own file rather than shared: the two apps are deployed
 * independently, and a schema shared across them would couple their release cycles.
 */

const PositionSchema = z.tuple([z.number(), z.number()]);

const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(PositionSchema)),
});

const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(PositionSchema))),
});

const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: PositionSchema,
});

/** A Point only ever appears on an alert whose source gave a centroid but no polygon. */
export const MapGeometrySchema = z.union([PolygonSchema, MultiPolygonSchema, PointSchema]);

export const DistrictFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.number(),
  geometry: MapGeometrySchema,
  properties: z.object({
    areaId: z.number(),
    slug: z.string(),
    nameEn: z.string(),
    nameHi: z.string(),
    division: z.enum(['garhwal', 'kumaon']).nullable(),
    centroid: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    isPlaceholder: z.boolean(),
    sourceNote: z.string(),
  }),
});

export const DistrictCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(DistrictFeatureSchema),
  attribution: z.array(z.string()),
});

export const AlertFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.number(),
  geometry: MapGeometrySchema,
  properties: z.object({
    alertId: z.number(),
    type: z.string(),
    severity: z.string(),
    urgency: z.string(),
    headline: z.string(),
    language: z.string(),
    authority: z.string(),
    issuedAt: z.string(),
    expiresAt: z.string().nullable(),
    areaSlugs: z.array(z.string()),
    attribution: z.string().nullable(),
    /**
     * How precisely the shape describes the affected area. Optional so an older API that
     * does not send it still parses; absent is treated as the least confident reading,
     * never as `published`.
     */
    extent: z.enum(['published', 'district', 'point']).optional(),
  }),
});

export const AlertCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(AlertFeatureSchema),
  attribution: z.array(z.string()),
});

export type MapGeometry = z.infer<typeof MapGeometrySchema>;
export type DistrictFeature = z.infer<typeof DistrictFeatureSchema>;
export type DistrictCollection = z.infer<typeof DistrictCollectionSchema>;
export type AlertFeature = z.infer<typeof AlertFeatureSchema>;
export type AlertCollection = z.infer<typeof AlertCollectionSchema>;

/**
 * The migration figures the choropleth is coloured from.
 *
 * Only the fields the map uses are modelled. The migration screen validates the same
 * endpoint against its own fuller schema — a map that only colours districts has no business
 * failing because a survey's evidence URL changed shape.
 */
export const MigrationDistrictSchema = z.object({
  slug: z.string(),
  coverage: z.string(),
  figures: z.array(
    z.object({
      surveyKey: z.string(),
      temporaryPersons: z.number().nullable(),
      permanentPersons: z.number().nullable(),
    }),
  ),
});

export const MigrationSummarySchema = z.object({
  districts: z.array(MigrationDistrictSchema),
});

export type MigrationDistrict = z.infer<typeof MigrationDistrictSchema>;
export type MigrationSummary = z.infer<typeof MigrationSummarySchema>;

/**
 * Messages the WebView document posts back.
 *
 * Validated rather than trusted for the same reason a network payload is (N5): the string
 * arrives from a separate JavaScript context, and `JSON.parse` alone proves nothing about
 * its shape.
 */
export const MapMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('district'), slug: z.string().min(1) }),
]);

export type MapMessage = z.infer<typeof MapMessageSchema>;
