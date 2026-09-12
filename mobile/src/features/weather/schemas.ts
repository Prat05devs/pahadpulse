import { z } from 'zod';

import { LocalisedTextSchema } from '@/types/api';

/** Weather and hydrology readings, straight from `web/src/features/weather/schemas.ts`. */

export const StationSchema = z.object({
  id: z.number(),
  sourceStationCode: z.string(),
  type: z.enum(['weather', 'river', 'reservoir']),
  name: LocalisedTextSchema,
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
  observedAt: z.string(),
  value: z.number(),
  unit: z.string(),
  sourceId: z.number(),
  fetchedAt: z.string(),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const ConditionSchema = z.object({
  /** The raw WMO code, kept so a finer rendering never needs an API change. */
  code: z.number(),
  condition: z.enum([
    'clear',
    'partly_cloudy',
    'cloudy',
    'fog',
    'drizzle',
    'rain',
    'heavy_rain',
    'snow',
    'thunderstorm',
    'unknown',
  ]),
  label: LocalisedTextSchema,
});

export type Condition = z.infer<typeof ConditionSchema>;
export type ConditionKey = Condition['condition'];

export const ForecastDaySchema = z.object({
  /** Local (IST) calendar date, `YYYY-MM-DD`. */
  date: z.string(),
  minTemperatureC: z.number().nullable(),
  maxTemperatureC: z.number().nullable(),
  precipitationMm: z.number().nullable(),
  condition: ConditionSchema.nullable(),
});

export type ForecastDay = z.infer<typeof ForecastDaySchema>;

/**
 * Everything after `station` is optional.
 *
 * That is deliberate and load-bearing: the app and the API deploy independently, and an app
 * already on someone's phone will meet an older API for as long as that install survives.
 * Optional fields let a new screen render against an API that has not caught up, instead of
 * rejecting the whole payload over one absent key.
 */
export const WeatherDataSchema = z.object({
  station: StationSchema,
  temperature: ObservationSchema.optional(),
  rainfall: ObservationSchema.optional(),
  humidity: ObservationSchema.optional(),
  wind: ObservationSchema.optional(),
  windDirection: ObservationSchema.optional(),
  condition: ConditionSchema.nullable().optional(),
  /** The instant the readings describe. Shown rather than implied. */
  observedAt: z.string().nullable().optional(),
  forecast: z.array(ForecastDaySchema).optional(),
  source: z
    .object({
      id: z.number(),
      key: z.string(),
      department: LocalisedTextSchema,
      attribution: z.string(),
    })
    .optional(),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

/** Maps the API's condition enum onto an icon, so no component invents its own mapping. */
export const CONDITION_ICONS: Record<ConditionKey, string> = {
  clear: 'sunny-outline',
  partly_cloudy: 'partly-sunny-outline',
  cloudy: 'cloud-outline',
  fog: 'cloudy-outline',
  drizzle: 'rainy-outline',
  rain: 'rainy-outline',
  heavy_rain: 'thunderstorm-outline',
  snow: 'snow-outline',
  thunderstorm: 'thunderstorm-outline',
  unknown: 'help-circle-outline',
};
