import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { AreaIndicatorsSchema } from './schemas';

export async function fetchAreaIndicators(slug: string) {
  return apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema);
}

export async function fetchAllIndicators() {
  return apiClient.get('/indicators', z.array(z.any()));
}

export async function fetchIndicatorComparison(slug1: string, slug2: string, categories?: string[]) {
  const params = new URLSearchParams();
  params.append('areas', `${slug1},${slug2}`);
  if (categories) {
    categories.forEach(cat => params.append('categories', cat));
  }

  const query = `?${params.toString()}`;
  return apiClient.get(`/indicators/compare${query}`, z.any());
}
