import type { AlertFilters } from './services';

export const alertKeys = {
  all: ['alerts'] as const,
  active: (filters?: AlertFilters) => [...alertKeys.all, 'active', filters ?? {}] as const,
  detail: (id: number) => [...alertKeys.all, 'detail', id] as const,
  summary: () => [...alertKeys.all, 'summary'] as const,
  byArea: (slug: string) => [...alertKeys.all, 'area', slug] as const,
};
