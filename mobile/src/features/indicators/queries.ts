export const indicatorKeys = {
  all: ['indicators'] as const,
  byArea: (slug: string) => [...indicatorKeys.all, 'area', slug] as const,
};
