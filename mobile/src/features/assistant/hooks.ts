import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/query-client';
import { useLanguage } from '@/stores';

import { fetchCatalogue } from './services';

export function useAssistantCatalogue() {
  const language = useLanguage();
  return useQuery({
    queryKey: ['assistant', 'catalogue', language],
    queryFn: ({ signal }) => fetchCatalogue(language, signal),
    staleTime: STALE_TIME.reference,
  });
}
