import { apiClient } from '@/lib/api';

import { SourceListSchema } from './schemas';

/** Every dataset this product reads, with the publisher's own link. */
export async function fetchSources() {
  // A references page must never retain a retired destination from an earlier deployment.
  // This small registry is read only when the page renders, so correctness is worth a fresh
  // request; live measurements keep the shared one-minute cache elsewhere.
  return apiClient.get('/sources', SourceListSchema, { cache: 'no-store' });
}
