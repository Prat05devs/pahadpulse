import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { WeatherDataSchema } from './schemas';
import { AirQualitySchema } from '@/features/air-quality/schemas';

/**
 * State-wide batch reads.
 *
 * These exist because the districts page and the weather page each rendered thirteen
 * districts and fetched them one HTTP request at a time — fourteen and fifteen round trips
 * respectively, for pages that show them all together. One request now does the same work.
 *
 * The per-district endpoints remain and are still used by the district detail page, which
 * genuinely wants one district and also wants its 7-day forecast — which the batch
 * deliberately omits, since no state-wide view shows it.
 */
const DistrictWeatherEntrySchema = z.object({
  areaSlug: z.string(),
  areaName: z.object({ en: z.string(), hi: z.string().nullable() }),
  weather: WeatherDataSchema.nullable(),
});

export type DistrictWeatherEntry = z.infer<typeof DistrictWeatherEntrySchema>;

const DistrictAirEntrySchema = z.object({
  areaSlug: z.string(),
  areaName: z.object({ en: z.string(), hi: z.string().nullable() }),
  air: AirQualitySchema.nullable(),
});

export type DistrictAirEntry = z.infer<typeof DistrictAirEntrySchema>;

export async function fetchAllDistrictWeather(): Promise<DistrictWeatherEntry[]> {
  return apiClient.get('/weather/districts', z.array(DistrictWeatherEntrySchema));
}

export async function fetchAllDistrictAirQuality(): Promise<DistrictAirEntry[]> {
  return apiClient.get('/air-quality/districts', z.array(DistrictAirEntrySchema));
}
