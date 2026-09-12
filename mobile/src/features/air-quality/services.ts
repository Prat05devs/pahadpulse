import { apiClient } from '@/lib/api';
import { AirQualitySchema, type AirQuality } from './schemas';

export async function fetchAirQuality(slug: string): Promise<AirQuality> {
  return apiClient.get(`/areas/${slug}/air-quality`, AirQualitySchema);
}

/**
 * Air quality for several districts at once.
 *
 * Settled rather than raced: a district whose ingestion has not run yet returns 404, and
 * one missing district must not blank the whole state view. Failures come back as null and
 * the caller renders them as absent.
 */
export async function fetchAirQualityForDistricts(
  slugs: readonly string[],
): Promise<(AirQuality | null)[]> {
  const results = await Promise.allSettled(slugs.map((slug) => fetchAirQuality(slug)));
  return results.map((result) => (result.status === 'fulfilled' ? result.value : null));
}
