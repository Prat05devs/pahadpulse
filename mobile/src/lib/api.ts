import { z } from 'zod';

import { REQUEST_TIMEOUT_MS } from '@/config/constants';
import { env } from '@/config/env';

/**
 * The single HTTP entry point. Nothing else in the app calls `fetch`.
 *
 * Two rules it exists to enforce:
 *   1. Every response is validated with Zod before it reaches a component. A payload off the
 *      network is `unknown` until proven otherwise.
 *   2. Every failure becomes an `ApiError` with a `kind`, so a screen can distinguish "you
 *      are offline" from "the server is broken" — on a phone those need different words and
 *      different recovery, and collapsing them into one "Something went wrong" is what makes
 *      an app feel unreliable in exactly the places this one is used.
 */

/** Why a request failed, in terms a screen can act on. */
export type ApiErrorKind =
  | 'offline'
  | 'timeout'
  | 'not-found'
  | 'http'
  | 'invalid-response'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** The API's own numeric error code, where it sent one. */
  readonly code: number;
  readonly status: number;

  constructor(kind: ApiErrorKind, code: number, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.code = code;
    this.status = status;
  }

  /** True when trying again might plausibly work. Drives whether a Retry button is shown. */
  get isRetryable(): boolean {
    return this.kind === 'offline' || this.kind === 'timeout' || this.status >= 500;
  }
}

/** The success envelope every endpoint wraps its payload in. */
const EnvelopeSchema = z.object({
  success: z.boolean().optional(),
  data: z.unknown(),
  message: z.string().optional(),
});

/** The error envelope. Both fields are optional because a proxy may answer instead. */
const ErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.number().optional(), message: z.string().optional() }).optional(),
  message: z.string().optional(),
});

/**
 * `AbortSignal.timeout` with a manual fallback.
 *
 * Hermes has not always shipped the static method, and silently having NO timeout is the
 * precise failure this guards against — a request that hangs forever leaves a spinner on
 * screen with no error to catch.
 */
function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(ms), clear: () => {} };
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

/**
 * React Native raises a bare `TypeError: Network request failed` when the device cannot
 * reach the host at all. There is no richer signal available, so the message is what we
 * have to match on.
 */
function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError && /network request failed/i.test(error.message);
}

type RequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = `${env.apiUrl}${endpoint}`;
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      // A caller's own signal wins — TanStack Query passes one to cancel stale queries.
      signal: options?.signal ?? timeout.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const raw = await response.text();

    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      // Almost always the wrong origin answering — a dev server or a captive portal.
      throw new ApiError(
        'invalid-response',
        10_000,
        `Expected JSON from ${url} but got ${response.headers.get('content-type') ?? 'an unknown type'} (HTTP ${response.status}). Check EXPO_PUBLIC_API_URL.`,
        response.status
      );
    }

    if (!response.ok) {
      const parsed = ErrorEnvelopeSchema.safeParse(json);
      const code = parsed.success ? (parsed.data.error?.code ?? response.status) : response.status;
      const message = parsed.success
        ? (parsed.data.error?.message ?? parsed.data.message ?? response.statusText)
        : response.statusText;
      throw new ApiError(
        response.status === 404 ? 'not-found' : 'http',
        code,
        message || `Request failed with ${response.status}`,
        response.status
      );
    }

    const envelope = EnvelopeSchema.safeParse(json);
    if (!envelope.success) {
      throw new ApiError(
        'invalid-response',
        10_000,
        `Response from ${url} was not in the expected envelope.`,
        response.status
      );
    }
    if (envelope.data.success === false) {
      throw new ApiError(
        'http',
        10_000,
        envelope.data.message ?? 'The API reported a failure.',
        response.status
      );
    }

    const result = schema.safeParse(envelope.data.data);
    if (!result.success) {
      /**
       * A schema mismatch is a real defect, not a blank screen.
       *
       * The web app swallowed these with `.catch(() => null)` and shipped panels that had
       * silently rendered nothing for weeks. Here it surfaces as an error state naming the
       * endpoint, so it is visible the first time someone opens the screen.
       */
      throw new ApiError(
        'invalid-response',
        10_000,
        `Unexpected response shape from ${endpoint}: ${result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.') || 'root'} ${i.message}`)
          .join('; ')}`,
        response.status
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbort(error)) {
      throw new ApiError(
        'timeout',
        10_408,
        `The server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`,
        504
      );
    }
    if (isNetworkFailure(error)) {
      throw new ApiError('offline', 10_503, 'No connection to the Pahad Pulse server.', 0);
    }
    throw new ApiError(
      'unknown',
      10_000,
      error instanceof Error ? error.message : 'An unexpected error occurred.',
      0
    );
  } finally {
    timeout.clear();
  }
}

export const apiClient = {
  get: <T>(
    endpoint: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: RequestOptions
  ) => request('GET', endpoint, schema, undefined, options),

  post: <T>(
    endpoint: string,
    body: unknown,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: RequestOptions
  ) => request('POST', endpoint, schema, body, options),
};

/** Build a query string, dropping empty values so `?limit=20` never becomes `?limit=20&type=`. */
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
