import { z } from 'zod';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiErrorResponse {
  error: {
    code: number;
    message: string;
  };
  requestId?: string;
}

interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * How long to wait for the API before giving up.
 *
 * This exists because of a real outage. When the database went away, the API could not
 * start, and these fetches did not fail — they HUNG. Every page here is
 * `dynamic = 'force-dynamic'`, so each request waited on a backend that would never answer,
 * and the whole public site stopped responding rather than degrading to empty panels.
 *
 * The `.catch(() => null)` guards throughout the app were no help: a hang is not an error,
 * so there was nothing to catch. A deadline is what turns an unreachable backend into a
 * normal, catchable failure.
 *
 * Eight seconds is chosen against the slowest legitimate response — a cold Render instance
 * answering a district query — not against a healthy one.
 */
const REQUEST_TIMEOUT_MS = 8_000;

/** Raised when the API did not answer in time. Carries a code so callers can tell it apart. */
export const API_TIMEOUT_CODE = 10_408;

/**
 * How long a cached response may be replayed before it is refetched.
 *
 * Sixty seconds, matching the shortest window any page here declares — the alerts page, which
 * is safety information. A single default keeps the guarantee simple: nothing on this site is
 * ever more than a minute stale, whatever its page-level `revalidate` says. Pages that want
 * longer are choosing when to REGENERATE, not asking to be served older data than this.
 */
const DEFAULT_REVALIDATE_SECONDS = 60;

/**
 * `AbortSignal.timeout` with a manual fallback.
 *
 * The static method is not available on every runtime this builds for, and silently having
 * no timeout is the exact failure this function exists to prevent — so the fallback is a
 * real controller rather than `undefined`.
 */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, ms);
  return controller.signal;
}

/** True for the various shapes an abort takes across runtimes. */
function isAbort(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError' || error.name === 'TimeoutError';
  }
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

async function readJsonBody(response: Response, url: string): Promise<unknown> {
  const raw = await response.text();

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Non-JSON body: usually the wrong origin (e.g. the Next dev server) answered.
    throw new ApiError(
      10000,
      `Expected JSON from ${url} but received ${response.headers.get('content-type') ?? 'an unknown content type'} (HTTP ${response.status}). Check NEXT_PUBLIC_API_URL points at the API server.`,
      response.status
    );
  }
}

export const apiClient = {
  async get<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        /**
         * Cached with an EXPLICIT lifetime, never `force-cache` alone.
         *
         * `force-cache` was a real production bug, and a safety-critical one. It makes an
         * entry immutable for the life of the deployment: the alerts page regenerated on its
         * 60-second window exactly as designed — the CDN age reset every minute — but the
         * underlying fetch kept replaying the body captured at build time, when no warnings
         * were in force. The site showed "No active alerts" for hours while the API was
         * serving four. Census figures on the same page looked fine throughout, because a
         * frozen cache is invisible on numbers that never change.
         *
         * A page's `export const revalidate` governs when the PAGE regenerates. It is not a
         * reliable ceiling on a `force-cache` fetch inside it, so the lifetime is stated
         * here instead of inferred. Callers that need something shorter pass
         * `next: { revalidate: n }`, and a genuinely live read still passes
         * `cache: 'no-store'` — both win, because `...options` is spread after this.
         */
        next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
        ...options,
        method: 'GET',
        // The caller's own signal wins if it passed one; otherwise the deadline applies.
        signal: options?.signal ?? timeoutSignal(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const json = await readJsonBody(response, url);

      if (!response.ok) {
        const errorData = json as ApiErrorResponse;
        throw new ApiError(
          errorData.error?.code || response.status,
          errorData.error?.message || response.statusText,
          response.status
        );
      }

      const successData = json as SuccessResponse<unknown>;
      if (!successData.success || !successData.data) {
        throw new ApiError(
          10000,
          `Invalid response: ${successData.message || 'No data returned'}`,
          response.status
        );
      }

      return schema.parse(successData.data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new ApiError(
          10000,
          `Invalid response format: ${error.message}`,
          500
        );
      }
      // Converted to an ApiError rather than rethrown raw: every caller already handles
      // ApiError, so an unreachable backend now degrades the same way a 500 does.
      if (isAbort(error)) {
        throw new ApiError(
          API_TIMEOUT_CODE,
          `The API did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${url}).`,
          504
        );
      }
      throw error;
    }
  },

  async post<T>(
    endpoint: string,
    body: unknown,
    schema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        method: 'POST',
        signal: options?.signal ?? timeoutSignal(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
      });

      const json = await readJsonBody(response, url);

      if (!response.ok) {
        const errorData = json as ApiErrorResponse;
        throw new ApiError(
          errorData.error?.code || response.status,
          errorData.error?.message || response.statusText,
          response.status
        );
      }

      const successData = json as SuccessResponse<unknown>;
      if (!successData.success || !successData.data) {
        throw new ApiError(
          10000,
          `Invalid response: ${successData.message || 'No data returned'}`,
          response.status
        );
      }

      return schema.parse(successData.data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new ApiError(
          10000,
          `Invalid response format: ${error.message}`,
          500
        );
      }
      // Converted to an ApiError rather than rethrown raw: every caller already handles
      // ApiError, so an unreachable backend now degrades the same way a 500 does.
      if (isAbort(error)) {
        throw new ApiError(
          API_TIMEOUT_CODE,
          `The API did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${url}).`,
          504
        );
      }
      throw error;
    }
  },
};
