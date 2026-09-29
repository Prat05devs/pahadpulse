import { apiClient } from '@/lib/api';
import { PilgrimArrivalsSchema, TourismGuideSchema } from './pilgrim-schemas';

/**
 * Bump only when the bundled tourism guide changes - kept equal to the web app's constant.
 * The backend caches this read model, so the version gives deterministic invalidation.
 */
const TOURISM_GUIDE_VERSION = '2026-09-25.2';

/**
 * Published yearly arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * Annual totals, not a live count - nothing here says how busy a shrine is today.
 */
export async function fetchPilgrimArrivals() {
  return apiClient.get('/tourism/pilgrim-arrivals', PilgrimArrivalsSchema);
}

/** The curated travel guide: Char Dham, pilgrimage places, destinations, links, helplines. */
export async function fetchTourismGuide() {
  return apiClient.get(
    `/tourism/guide?guideVersion=${encodeURIComponent(TOURISM_GUIDE_VERSION)}`,
    TourismGuideSchema
  );
}
