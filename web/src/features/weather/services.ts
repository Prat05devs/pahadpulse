import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { RiverLevelSchema, WeatherDataSchema } from './schemas';

export async function fetchWeatherForArea(slug: string) {
  return apiClient.get(`/areas/${slug}/weather`, WeatherDataSchema);
}

export async function fetchRiverLevels() {
  return apiClient.get('/rivers/levels', z.array(RiverLevelSchema));
}

export async function fetchReservoirs() {
  return apiClient.get('/reservoirs', z.any());
}

export async function fetchStations(cursor?: number, limit: number = 50) {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor.toString());
  params.append('limit', limit.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get(`/stations${query}`, z.any());
}

export async function fetchStationSeries(stationId: number) {
  return apiClient.get(`/stations/${stationId}/series`, z.any());
}
