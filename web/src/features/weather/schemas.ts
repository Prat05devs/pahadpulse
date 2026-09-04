import { z } from 'zod';

export const StationSchema = z.object({
  id: z.number(),
  sourceStationCode: z.string(),
  type: z.enum(['weather', 'river', 'reservoir']),
  name: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  areaId: z.number(),
  lat: z.number(),
  lng: z.number(),
  riverName: z.string().nullable(),
  sourceId: z.number(),
});

export type Station = z.infer<typeof StationSchema>;

export const ObservationSchema = z.object({
  stationId: z.number(),
  metric: z.string(),
  observedAt: z.string().datetime(),
  value: z.number(),
  unit: z.string(),
  sourceId: z.number(),
  fetchedAt: z.string().datetime(),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const ThresholdSchema = z.object({
  stationId: z.number(),
  level: z.enum(['warning', 'danger', 'hfl']),
  value: z.number(),
  unit: z.string(),
  sourceId: z.number(),
});

export type Threshold = z.infer<typeof ThresholdSchema>;

export const RiverLevelSchema = z.object({
  station: StationSchema,
  latestLevel: ObservationSchema.extend({
    delta: z.number().nullable(),
  }),
  threshold: ThresholdSchema.nullable(),
  source: z.object({
    id: z.number(),
    department: z.object({
      en: z.string(),
      hi: z.string(),
    }),
  }),
});

export type RiverLevel = z.infer<typeof RiverLevelSchema>;

export const WeatherDataSchema = z.object({
  temperature: ObservationSchema.optional(),
  rainfall: ObservationSchema.optional(),
  humidity: ObservationSchema.optional(),
  station: StationSchema,
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

export const ForecastSchema = z.object({
  areaId: z.number(),
  metric: z.string(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  value: z.number(),
  sourceId: z.number(),
  fetchedAt: z.string().datetime(),
});

export type Forecast = z.infer<typeof ForecastSchema>;
