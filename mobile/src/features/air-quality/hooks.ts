import { useQuery, useQueries } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchAirQuality, fetchAirQualityForDistricts } from './services';
import { airQualityKeys } from './queries';

export function useAirQuality(slug: string) {
  return useQuery({
    queryKey: airQualityKeys.area(slug),
    queryFn: () => fetchAirQuality(slug),
    staleTime: STALE_TIME.hourly,
  });
}
