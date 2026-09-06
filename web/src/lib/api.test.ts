import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { API_TIMEOUT_CODE, ApiError, apiClient } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

const Schema = z.object({ ok: z.boolean() });

describe('apiClient timeout', () => {
  /**
   * The regression this exists for. When the database went away the API stopped answering
   * and these fetches HUNG rather than failing — every page is force-dynamic, so the whole
   * public site stopped responding. A hang is not an error, so the `.catch(() => null)`
   * guards throughout the app caught nothing.
   */
  it('fails with a timeout instead of hanging when the API never answers', async () => {
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      // A backend that accepts the connection and then says nothing, which is exactly what
      // an unreachable-but-routable API does. Resolves only if the signal aborts.
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'TimeoutError'));
        });
      });
    });

    await expect(apiClient.get('/anything', Schema)).rejects.toBeInstanceOf(ApiError);
  }, 15_000);

  it('reports the timeout as a catchable ApiError, not a raw abort', async () => {
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'TimeoutError'));
        });
      });
    });

    // Callers guard with `.catch(() => null)`; that only works if this is a normal
    // rejection they can catch, which is the whole point of the conversion.
    const result = await apiClient.get('/anything', Schema).catch((error: unknown) => error);

    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).code).toBe(API_TIMEOUT_CODE);
    expect((result as ApiError).status).toBe(504);
  }, 15_000);

  it('passes a signal to fetch so the request is actually abortable', async () => {
    let seenSignal: AbortSignal | null | undefined;

    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      seenSignal = init?.signal;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { ok: true }, message: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    await apiClient.get('/anything', Schema);

    expect(seenSignal).toBeDefined();
    expect(seenSignal).not.toBeNull();
  });

  it('still returns data normally when the API answers', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { ok: true }, message: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    await expect(apiClient.get('/anything', Schema)).resolves.toEqual({ ok: true });
  });

  it("lets a caller's own signal take precedence", async () => {
    const controller = new AbortController();
    let seenSignal: AbortSignal | null | undefined;

    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      seenSignal = init?.signal;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { ok: true }, message: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    await apiClient.get('/anything', Schema, { signal: controller.signal });

    expect(seenSignal).toBe(controller.signal);
  });
});
