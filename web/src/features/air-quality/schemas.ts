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

/** CPCB's six categories. Deliberately separate from the US EPA bands above. */
export const NATIONAL_AQI_BANDS = [
  'good',
  'satisfactory',
  'moderate',
  'poor',
  'very_poor',
  'severe',
] as const;
export type NationalAqiBand = (typeof NATIONAL_AQI_BANDS)[number];

export const AirQualitySchema = z.object({
  station: StationSchema,
  /** Null when the source returned concentrations but no index. */
  aqi: z
    .object({
      value: z.number(),
      band: z.enum(AQI_BANDS),
    })
    .nullable(),
  /**
   * India's National AQI (CPCB), computed by the API from the concentrations.
   *
   * Null means "not enough data for an index" — fewer than three pollutants, no particulate
   * among them, or a window without enough hourly readings to be an average. It never means
   * clean air, so the panel must not render it as a zero or an all-clear.
   */
  nationalAqi: z
    .object({
      value: z.number(),
      band: z.enum(NATIONAL_AQI_BANDS),
      dominantPollutant: z.string(),
      pollutantsUsed: z.array(
        z.object({
          metric: z.string(),
          subIndex: z.number(),
          averagingHours: z.number(),
        }),
      ),
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
