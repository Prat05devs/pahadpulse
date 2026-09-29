export const indicatorKeys = {
  all: ['indicators'] as const,
  catalogue: () => [...indicatorKeys.all, 'catalogue'] as const,
  byArea: (slug: string) => [...indicatorKeys.all, 'area', slug] as const,
};
