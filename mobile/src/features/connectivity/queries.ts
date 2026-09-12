export const connectivityKeys = {
  all: ['connectivity'] as const,
  state: () => [...connectivityKeys.all, 'state'] as const,
  area: (slug: string) => [...connectivityKeys.all, 'area', slug] as const,
};
