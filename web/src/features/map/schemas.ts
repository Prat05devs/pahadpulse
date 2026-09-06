import { z } from 'zod';

/**
 * The map's boundary at the network edge (N5). Geometry arriving from the API is validated
 * structurally rather than trusted — a malformed coordinate array is the kind of thing that
 * throws deep inside the renderer, far from the cause.
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
     * How precisely the shape describes the affected area. The caption must be written
     * from this: `published` is the authority's own polygon, `district` is only the
     * districts named, `point` is a single location.
     *
     * Optional so an older API that does not send it still parses; absent is treated as
     * the least confident reading, never as `published`.
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
