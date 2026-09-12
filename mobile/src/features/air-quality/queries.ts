export const airQualityKeys = {
  all: ['air-quality'] as const,
  area: (slug: string) => [...airQualityKeys.all, 'area', slug] as const,
};
