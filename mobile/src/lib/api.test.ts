import { z } from 'zod';

import { ApiError, apiClient, toQuery } from './api';

const DistrictSchema = z.object({ slug: z.string(), name: z.string() });

/**
 * A fake fetch response.
 *
 * Deliberately NOT `Partial<Response>`: on `Response` the `body` field is a ReadableStream,
 * so extending it makes every JSON payload here a type error. What the client actually reads
 * is `text()`, so that is what this models.
 */
type FakeResponse = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  /** A string is sent verbatim; anything else is JSON-encoded. */
  body?: unknown;
};

function mockFetch(response: FakeResponse) {
  const body = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    headers: new Map([['content-type', 'application/json']]) as unknown as Headers,
    text: async () => body,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('apiClient.get', () => {
  it('unwraps the envelope and returns validated data', async () => {
    mockFetch({ body: { success: true, data: { slug: 'dehradun', name: 'Dehradun' } } });
    await expect(apiClient.get('/areas/x', DistrictSchema)).resolves.toEqual({
      slug: 'dehradun',
      name: 'Dehradun',
    });
  });

  it('raises invalid-response when the payload does not match the schema', async () => {
    // This is the failure the web app used to swallow with `.catch(() => null)`, leaving a
    // panel silently blank. It has to surface as an error, not as empty data.
    mockFetch({ body: { success: true, data: { slug: 'dehradun' } } });

    await expect(apiClient.get('/areas/x', DistrictSchema)).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('names the endpoint in a schema-mismatch message', async () => {
    mockFetch({ body: { success: true, data: { slug: 1 } } });
    await expect(apiClient.get('/areas/x', DistrictSchema)).rejects.toThrow(/\/areas\/x/);
  });

  it('classifies a 404 as not-found and does not offer a retry', async () => {
    mockFetch({
      ok: false,
      status: 404,
      body: { error: { code: 40401, message: 'District not found' } },
    });

    const error = await apiClient.get('/areas/x', DistrictSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('not-found');
    expect((error as ApiError).code).toBe(40401);
    expect((error as ApiError).isRetryable).toBe(false);
  });

  it('treats a lost connection as offline, and as retryable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const error = await apiClient.get('/areas/x', DistrictSchema).catch((e: unknown) => e);
    expect((error as ApiError).kind).toBe('offline');
    expect((error as ApiError).isRetryable).toBe(true);
  });

  it('treats an abort as a timeout', async () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abort);

    const error = await apiClient.get('/areas/x', DistrictSchema).catch((e: unknown) => e);
    expect((error as ApiError).kind).toBe('timeout');
  });

  it('explains a non-JSON body instead of throwing a parse error', async () => {
    // Usually the wrong origin answering — a dev server or a captive portal.
    mockFetch({ body: '<!doctype html><html></html>' });

    const error = await apiClient.get('/areas/x', DistrictSchema).catch((e: unknown) => e);
    expect((error as ApiError).kind).toBe('invalid-response');
    expect((error as ApiError).message).toMatch(/EXPO_PUBLIC_API_URL/);
  });

  it('rejects when the envelope reports failure despite a 200', async () => {
    mockFetch({ body: { success: false, data: null, message: 'Ingestion run failed' } });
    await expect(apiClient.get('/areas/x', DistrictSchema)).rejects.toThrow(
      'Ingestion run failed'
    );
  });
});

describe('toQuery', () => {
  it('drops empty values', () => {
    expect(toQuery({ limit: 20, type: undefined, minSeverity: '', cursor: null })).toBe(
      '?limit=20'
    );
  });

  it('returns an empty string when nothing survives', () => {
    expect(toQuery({ type: undefined })).toBe('');
  });
});
