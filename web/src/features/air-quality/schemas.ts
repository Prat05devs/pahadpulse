import { z } from 'zod';
import { ObservationSchema, StationSchema } from '@/features/weather/schemas';

export const AQI_BANDS = [
  'good',
  'moderate',
  'unhealthy_sensitive',
  'unhealthy',
  'very_unhealthy',
  'hazardous',
  'unknown',
] as const;

export type AqiBand = (typeof AQI_BANDS)[number];

export const AirQualitySchema = z.object({
  station: StationSchema,
  /** Null when the source returned concentrations but no index. */
  aqi: z
    .object({
      value: z.number(),
      band: z.enum(AQI_BANDS),
    })
    .nullable(),
  pm25: ObservationSchema.optional(),
  pm10: ObservationSchema.optional(),
  nitrogenDioxide: ObservationSchema.optional(),
  ozone: ObservationSchema.optional(),
  sulphurDioxide: ObservationSchema.optional(),
  carbonMonoxide: ObservationSchema.optional(),
  observedAt: z.string().nullable(),
  source: z.object({
    id: z.number(),
    key: z.string(),
    department: z.object({ en: z.string(), hi: z.string() }),
    attribution: z.string(),
  }),
});

export type AirQuality = z.infer<typeof AirQualitySchema>;
