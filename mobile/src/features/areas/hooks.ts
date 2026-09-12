import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { STALE_TIME } from '@/lib/query-client';
import { localise } from '@/lib/format';
import { useLanguage, useSavedDistricts } from '@/stores';

import { areaKeys } from './queries';
import { fetchDistrictDetail, fetchDistricts } from './services';

/**
 * Every district in the state.
 *
 * Marked as reference data: the list of districts changes on the order of decades, so
 * refetching it hourly costs a request for nothing. It is also the query most worth having
 * in the offline cache, since it is what the districts tab renders first.
 */
export function useDistricts() {
  return useQuery({
    queryKey: areaKeys.districts(),
    queryFn: ({ signal }) => fetchDistricts(signal),
    staleTime: STALE_TIME.reference,
  });
}

export function useDistrictDetail(slug: string) {
  return useQuery({
    queryKey: areaKeys.district(slug),
    queryFn: ({ signal }) => fetchDistrictDetail(slug, signal),
    staleTime: STALE_TIME.reference,
    enabled: slug.length > 0,
  });
}

/**
 * Districts filtered by a search term and sorted with the reader's saved ones first.
 *
 * Derived from the query rather than stored: the saved list lives in Zustand and the
 * district list in TanStack Query, and combining them at read time is what keeps a single
 * source of truth for each. Storing the merged result would create a third copy to go stale.
 */
export function useDistrictList(search: string) {
  const query = useDistricts();
  const language = useLanguage();
  const saved = useSavedDistricts();

  const districts = useMemo(() => {
    const all = query.data ?? [];
    const term = search.trim().toLowerCase();

    const matched = term
      ? all.filter((d) => {
          const en = d.name.en.toLowerCase();
          const hi = d.name.hi.toLowerCase();
          return en.includes(term) || hi.includes(term) || d.slug.includes(term);
        })
      : all;

    return [...matched].sort((a, b) => {
      const aSaved = saved.includes(a.slug);
      const bSaved = saved.includes(b.slug);
      if (aSaved !== bSaved) return aSaved ? -1 : 1;
      return localise(a.name, language).localeCompare(localise(b.name, language));
    });
  }, [query.data, search, saved, language]);

  return { ...query, districts };
}
