/**
 * Query keys for the areas feature.
 *
 * A key factory rather than inline arrays: invalidating "everything about Dehradun" needs
 * every key that mentions it to share a prefix, and hand-written arrays drift the moment two
 * screens spell the same key differently.
 */
export const areaKeys = {
  all: ['areas'] as const,
  districts: () => [...areaKeys.all, 'districts'] as const,
  district: (slug: string) => [...areaKeys.all, 'district', slug] as const,
};
