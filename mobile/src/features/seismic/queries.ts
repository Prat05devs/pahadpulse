export const seismicKeys = {
  all: ['seismic'] as const,
  recent: () => [...seismicKeys.all, 'recent'] as const,
};
