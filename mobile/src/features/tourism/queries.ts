export const tourismKeys = {
  all: ['tourism'] as const,
  destinations: () => [...tourismKeys.all, 'destinations'] as const,
  destination: (slug: string) => [...tourismKeys.destinations(), slug] as const,
  charDhamLoad: () => [...tourismKeys.all, 'charDhamLoad'] as const,
  pilgrimArrivals: () => [...tourismKeys.all, 'pilgrimArrivals'] as const,
};
