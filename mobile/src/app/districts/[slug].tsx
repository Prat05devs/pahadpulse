import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { DistrictDetailScreen } from '@/features/areas';

/**
 * A district slug as it may arrive from a route or a deep link.
 *
 * Expo Router hands back `string | string[] | undefined`, and a deep link is an untrusted
 * boundary like any other (N5): `pahadpulse://districts/` gives an empty string, and a
 * repeated param gives an array. Either would otherwise reach a query key and be fetched.
 * Lowercased because slugs are lowercase and a link shared from elsewhere may not be.
 */
const SlugParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value[0] : value))
  .pipe(
    z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/i)
      .transform((slug) => slug.toLowerCase()),
  );

/** `/districts/dehradun`, and the deep link `pahadpulse://districts/dehradun`. */
export default function DistrictRoute() {
  const { slug } = useLocalSearchParams();
  const parsed = SlugParam.safeParse(slug);

  // An empty slug renders the screen's own not-found state rather than throwing: a bad deep
  // link should land somewhere recoverable, not on a red screen.
  return <DistrictDetailScreen slug={parsed.success ? parsed.data : ''} />;
}
