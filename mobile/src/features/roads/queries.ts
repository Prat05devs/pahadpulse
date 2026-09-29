export const roadsKeys = {
  all: ['roads'] as const,
  network: () => [...roadsKeys.all, 'network'] as const,
  closures: (district: string | undefined) =>
    [...roadsKeys.all, 'closures', district ?? 'statewide'] as const,
};
