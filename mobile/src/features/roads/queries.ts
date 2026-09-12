export const roadsKeys = {
  all: ['roads'] as const,
  network: () => [...roadsKeys.all, 'network'] as const,
};
