import { apiClient } from '@/lib/api';

import { WeatherDataSchema, type WeatherData } from './schemas';

export function fetchAreaWeather(slug: string, signal?: AbortSignal): Promise<WeatherData> {
  return apiClient.get(`/areas/${slug}/weather`, WeatherDataSchema, { signal });
}
