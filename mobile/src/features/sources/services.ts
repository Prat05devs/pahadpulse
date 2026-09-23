import { apiClient } from '@/lib/api';

import { SourceListSchema, type Source } from './schemas';

/** Every dataset this product reads, with the publisher's own link. */
export function fetchSources(signal?: AbortSignal): Promise<Source[]> {
  return apiClient.get('/sources', SourceListSchema, { signal });
}
