import { z } from 'zod';

/**
 * An optional slug-like query param (`?district=chamoli`, `?to=kedarnath`).
 *
 * A deep link is an untrusted boundary (N5): Expo Router hands back `string | string[] |
 * undefined`, and anything that is not a plain slug is dropped rather than fetched.
 */
const OptionalSlugParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value[0] : value))
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/i)
      .transform((slug) => slug.toLowerCase())
      .optional()
  );

export function parseOptionalSlug(value: unknown): string | undefined {
  const parsed = OptionalSlugParam.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** A `YYYY-MM-DD` date param, or undefined. Whether it is in range is the caller's call. */
export function parseDateParam(value: unknown): string | undefined {
  const single = Array.isArray(value) ? (value[0] as unknown) : value;
  return typeof single === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(single) ? single : undefined;
}
