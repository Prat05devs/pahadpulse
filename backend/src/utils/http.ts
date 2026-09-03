import { err, ok, type Result } from 'neverthrow';

import { ERRORS, type RequestError } from './errors.js';
import createLogger from './logger.js';

const logger = createLogger('@http');

export interface FetchTextOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

const DEFAULTS: Required<FetchTextOptions> = {
  timeoutMs: 10_000,
  retries: 2,
  retryDelayMs: 500,
  headers: {},
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a URL as text with a timeout and bounded retries. Shared by every connector that
 * calls an external HTTP source, per the general ingestion rule: retry, timeout, and never
 * hang a run forever.
 *
 * Retries network failures, timeouts and 5xx. Does not retry 4xx (the request itself is
 * wrong and retrying won't fix it) except 429, which is retried with the same backoff.
 */
export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<Result<string, RequestError>> {
  const { timeoutMs, retries, retryDelayMs, headers } = { ...DEFAULTS, ...options };

  let lastError: RequestError = ERRORS.UPSTREAM_UNAVAILABLE;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timer);

      if (response.status === 429) {
        lastError = ERRORS.UPSTREAM_RATE_LIMITED;
      } else if (response.status >= 500) {
        lastError = ERRORS.UPSTREAM_UNAVAILABLE;
      } else if (!response.ok) {
        // 4xx other than 429 — the request is wrong, not transient. Fail without retrying.
        logger.warn('fetch returned a non-retryable status', { url, status: response.status });
        return err(ERRORS.UPSTREAM_UNAVAILABLE);
      } else {
        return ok(await response.text());
      }
    } catch (error) {
      clearTimeout(timer);
      const aborted = error instanceof Error && error.name === 'AbortError';
      logger.warn('fetch attempt failed', {
        url,
        attempt,
        aborted,
        error: error instanceof Error ? error.message : String(error),
      });
      lastError = ERRORS.UPSTREAM_UNAVAILABLE;
    }

    if (attempt < retries) await sleep(retryDelayMs * (attempt + 1));
  }

  return err(lastError);
}
