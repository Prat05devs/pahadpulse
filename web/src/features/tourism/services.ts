import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { DestinationWithLoadSchema } from './schemas';

export async function fetchDestinations() {
  return apiClient.get('/destinations', z.array(DestinationWithLoadSchema));
}

export async function fetchDestination(slug: string) {
  return apiClient.get(`/destinations/${slug}`, DestinationWithLoadSchema);
}

export async function fetchCharDhamLoad() {
  return apiClient.get('/tourism/char-dham', z.array(DestinationWithLoadSchema));
}
