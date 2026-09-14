import { apiClient } from '@/lib/api';
import { PilgrimArrivalsSchema } from './pilgrim-schemas';

/**
 * Published yearly arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * Annual totals, not a live count — nothing here says how busy a shrine is today.
 */
export async function fetchPilgrimArrivals() {
  return apiClient.get('/tourism/pilgrim-arrivals', PilgrimArrivalsSchema);
}
