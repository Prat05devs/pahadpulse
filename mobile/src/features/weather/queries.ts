export const weatherKeys = {
  all: ['weather'] as const,
  byArea: (slug: string) => [...weatherKeys.all, 'area', slug] as const,
};
