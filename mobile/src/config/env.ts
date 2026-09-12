import { z } from 'zod';

/**
 * The ONLY module allowed to read `process.env`. Enforced by an ESLint rule.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables into the bundle at build time via a literal string
 * substitution, so each one must be written out in full below. `process.env[key]` with a
 * computed key returns undefined in a production build — a bug that only shows up after
 * release, which is exactly why this file reads them explicitly and validates the result.
 */
const EnvSchema = z.object({
  /** Base URL of the Pahad Pulse API, including the `/api` prefix and no trailing slash. */
  apiUrl: z
    .string()
    .url('EXPO_PUBLIC_API_URL must be a full URL, e.g. http://localhost:3000/api')
    .transform((url) => url.replace(/\/+$/, '')),
  /** The public web portal, for "read more" links out of the app. */
  webUrl: z.string().url().transform((url) => url.replace(/\/+$/, '')),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pahadpulse.in',
});

if (!parsed.success) {
  /**
   * Fail loudly at startup, not lazily at the first request.
   *
   * A misconfigured base URL otherwise surfaces as every screen showing a network error,
   * which sends whoever is debugging it to the API instead of to their `.env`.
   */
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`
  );
}

export const env: Env = parsed.data;
