export const airQualityKeys = {
  all: ['air-quality'] as const,
  districts: () => [...airQualityKeys.all, 'districts'] as const,
  area: (slug: string) => [...airQualityKeys.all, 'area', slug] as const,
};
