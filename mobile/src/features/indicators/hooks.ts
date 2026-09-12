import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { STALE_TIME } from '@/lib/query-client';

import { indicatorKeys } from './queries';
import { fetchAreaIndicators } from './services';
import type { AreaIndicatorValue } from './schemas';

export function useAreaIndicators(slug: string) {
  return useQuery({
    queryKey: indicatorKeys.byArea(slug),
    queryFn: ({ signal }) => fetchAreaIndicators(slug, signal),
    // Census and survey figures have vintages measured in years. Refetching them hourly
    // would spend a request to receive the same number.
    staleTime: STALE_TIME.reference,
    enabled: slug.length > 0,
  });
}

export type IndicatorGroup = {
  category: string;
  values: AreaIndicatorValue[];
};

/**
 * Indicators grouped by category, for a sectioned list.
 *
 * Grouping happens here rather than in the component so the screen stays declarative and the
 * logic is testable without rendering anything.
 */
export function useGroupedAreaIndicators(slug: string) {
  const query = useAreaIndicators(slug);

  const groups = useMemo<IndicatorGroup[]>(() => {
    const values = query.data?.values ?? [];
    const byCategory = new Map<string, AreaIndicatorValue[]>();

    for (const value of values) {
      const list = byCategory.get(value.indicator.category);
      if (list) list.push(value);
      else byCategory.set(value.indicator.category, [value]);
    }

    return [...byCategory.entries()]
      .map(([category, list]) => ({ category, values: list }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [query.data]);

  return { ...query, groups, pending: query.data?.pending ?? [] };
}
