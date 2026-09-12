/**
 * Query keys for the map feature.
 *
 * A key factory rather than inline arrays, for the same reason as `areaKeys`: every key that
 * mentions the map shares a prefix, so the whole layer can be invalidated at once.
 */
export const mapKeys = {
  all: ['map'] as const,
  districts: () => [...mapKeys.all, 'districts'] as const,
  alerts: () => [...mapKeys.all, 'alerts'] as const,
  migration: () => [...mapKeys.all, 'migration'] as const,
};
