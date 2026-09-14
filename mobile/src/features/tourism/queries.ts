export const tourismKeys = {
  all: ['tourism'] as const,
  pilgrimArrivals: () => [...tourismKeys.all, 'pilgrimArrivals'] as const,
};
