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

/**
 * The caching contract.
 *
 * These exist because of a live, safety-critical failure. `cache: 'force-cache'` with no
 * stated lifetime pinned each response for the life of the deployment: the alerts page
 * regenerated on its 60-second window — the CDN age reset every minute — while the fetch
 * underneath replayed the body captured at build time. The site showed "No active alerts"
 * for hours while the API served four. The Census figures beside them looked correct
 * throughout, because a frozen cache is invisible on numbers that never change.
 *
 * The whole test suite passed while that was happening, because nothing asserted what the
 * client asked the cache for. Now something does.
 */
describe('apiClient caching', () => {
  function captureInit(): { init: RequestInit | undefined } {
    const captured: { init: RequestInit | undefined } = { init: undefined };
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      captured.init = init;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { ok: true }, message: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    return captured;
  }

  it('always states an explicit revalidate window', async () => {
    const captured = captureInit();
    await apiClient.get('/anything', Schema);

    const next = (captured.init as { next?: { revalidate?: number } } | undefined)?.next;
    expect(typeof next?.revalidate).toBe('number');
    expect(next?.revalidate).toBeGreaterThan(0);
    // A minute at most: nothing on this site may be staler than the alerts window.
    expect(next?.revalidate).toBeLessThanOrEqual(60);
  });

  it('never sends bare force-cache, which pins a response indefinitely', async () => {
    const captured = captureInit();
    await apiClient.get('/anything', Schema);
    expect(captured.init?.cache).not.toBe('force-cache');
  });

  it('lets a caller demand a live read', async () => {
    const captured = captureInit();
    await apiClient.get('/anything', Schema, { cache: 'no-store' });
    expect(captured.init?.cache).toBe('no-store');
  });

  it('lets a caller shorten the window', async () => {
    const captured = captureInit();
    await apiClient.get('/anything', Schema, {
      next: { revalidate: 10 },
    } as RequestInit);
    const next = (captured.init as { next?: { revalidate?: number } } | undefined)?.next;
    expect(next?.revalidate).toBe(10);
  });
});
