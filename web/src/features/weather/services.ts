import { apiClient } from '@/lib/api';
import { WeatherDataSchema } from './schemas';

export async function fetchWeatherForArea(slug: string) {
  return apiClient.get(`/areas/${slug}/weather`, WeatherDataSchema);
}
