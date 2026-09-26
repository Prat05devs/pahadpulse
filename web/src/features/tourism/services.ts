import { apiClient } from '@/lib/api';
import { PilgrimArrivalsSchema, TourismOverviewSchema } from './pilgrim-schemas';

// Bump only when the bundled tourism guide changes. The backend and Next.js intentionally cache
// this read model, so a content version gives deployments immediate, deterministic invalidation
// without disabling the cache for every visitor.
const TOURISM_GUIDE_VERSION = '2026-09-25.2';

/**
 * Published yearly arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * Annual totals, not a live count — nothing here says how busy a shrine is today.
 */
export async function fetchPilgrimArrivals() {
  return apiClient.get('/tourism/pilgrim-arrivals', PilgrimArrivalsSchema);
}

/** One request for every tourism-page section; the backend composes and caches the read model. */
export async function fetchTourismOverview() {
  return apiClient.get(
    `/tourism/overview?guideVersion=${encodeURIComponent(TOURISM_GUIDE_VERSION)}`,
    TourismOverviewSchema,
    {
      next: { revalidate: 24 * 60 * 60 },
    }
  );
}
