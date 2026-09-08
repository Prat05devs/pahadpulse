import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { DestinationWithLoadSchema } from './schemas';
import { PilgrimArrivalsSchema } from './pilgrim-schemas';

export async function fetchDestinations() {
  return apiClient.get('/destinations', z.array(DestinationWithLoadSchema));
}

export async function fetchDestination(slug: string) {
  return apiClient.get(`/destinations/${slug}`, DestinationWithLoadSchema);
}

export async function fetchCharDhamLoad() {
  return apiClient.get('/tourism/char-dham', z.array(DestinationWithLoadSchema));
}

/**
 * Published yearly arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * Annual totals, not a live count — nothing here says how busy a shrine is today.
 */
export async function fetchPilgrimArrivals() {
  return apiClient.get('/tourism/pilgrim-arrivals', PilgrimArrivalsSchema);
}
