import { apiClient } from '@/lib/api';

import { SourceListSchema } from './schemas';

/** Every dataset this product reads, with the publisher's own link. */
export async function fetchSources() {
  return apiClient.get('/sources', SourceListSchema);
}
