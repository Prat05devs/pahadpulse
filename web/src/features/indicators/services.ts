import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { AreaIndicatorsSchema, ComparisonSchema } from './schemas';

export async function fetchAreaIndicators(slug: string) {
  return apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema);
}

export async function fetchAllIndicators() {
  return apiClient.get('/indicators', z.array(z.any()));
}

export async function fetchIndicatorComparison(
  slugA: string,
  slugB: string,
  categories?: string[]
) {
  const params = new URLSearchParams();
  params.append('areas', `${slugA},${slugB}`);
  if (categories) {
    for (const category of categories) params.append('categories', category);
  }

  return apiClient.get(`/indicators/compare?${params.toString()}`, ComparisonSchema);
}
