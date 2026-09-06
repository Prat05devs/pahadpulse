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

export const ConditionSchema = z.object({
  /** The raw WMO code, kept so a finer rendering never needs the API to change. */
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
  label: z.object({ en: z.string(), hi: z.string() }),
});

export type Condition = z.infer<typeof ConditionSchema>;

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
 * The three original fields keep their exact shape and names.
 *
 * Everything added below is `.optional()` or defaulted, which is what lets the district
 * page — which has been calling this endpoint and catching its 404 since before the
 * endpoint existed — start rendering real data without its fetch changing at all.
 */
export const WeatherDataSchema = z.object({
  temperature: ObservationSchema.optional(),
  rainfall: ObservationSchema.optional(),
  humidity: ObservationSchema.optional(),
  station: StationSchema,

  wind: ObservationSchema.optional(),
  windDirection: ObservationSchema.optional(),
  condition: ConditionSchema.nullable().optional(),
  /** The instant the readings describe. Shown rather than implied (HYD-6). */
  observedAt: z.string().nullable().optional(),
  // Plain `.optional()` rather than a Zod default: the API client's generic infers this
  // schema's input type, so a default would still surface as possibly-undefined at the
  // call site. The panel treats an absent forecast as an empty one, which it must handle
  // anyway for an older API that does not send the field.
  forecast: z.array(ForecastDaySchema).optional(),
  /** HYD-5: the source actually used, so the panel can name it. */
  source: z
    .object({
      id: z.number(),
      key: z.string(),
      department: z.object({ en: z.string(), hi: z.string() }),
      attribution: z.string(),
    })
    .optional(),
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
