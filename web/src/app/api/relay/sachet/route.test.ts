// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const KEY = 'k'.repeat(40);

function relay(query: string, key: string | null = KEY): Promise<Response> {
  const headers = new Headers();
  if (key !== null) headers.set('x-relay-key', key);
  return GET(new Request(`https://www.pahadpulse.live/api/relay/sachet?${query}`, { headers }));
}

const upstream = vi.fn<[string, RequestInit?], Promise<Response>>();

beforeEach(() => {
  vi.stubEnv('SACHET_RELAY_KEY', KEY);
  vi.stubGlobal('fetch', upstream);
  // A fresh Response per call: a body can only be read once.
  upstream.mockImplementation(() =>
    Promise.resolve(
      new Response('<rss/>', { status: 200, headers: { 'content-type': 'text/xml' } })
    )
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  upstream.mockReset();
});

describe('SACHET relay', () => {
  it('fetches the Uttarakhand feed and passes the body through', async () => {
    const response = await relay('resource=feed');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<rss/>');
    expect(upstream).toHaveBeenCalledWith(
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_uttarakhand.xml',
      expect.anything()
    );
  });

  it('builds the alert and polygon URLs from a numeric identifier', async () => {
    await relay('resource=alert&identifier=1789996329134009');
    await relay('resource=polygon&identifier=1789996329134009');

    expect(upstream.mock.calls.map(([url]) => url)).toEqual([
      'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1789996329134009',
      'https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=1789996329134009',
    ]);
  });

  it('refuses a request without the right key', async () => {
    expect((await relay('resource=feed', null)).status).toBe(401);
    expect((await relay('resource=feed', 'wrong')).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('is switched off when no key is configured', async () => {
    vi.stubEnv('SACHET_RELAY_KEY', '');

    expect((await relay('resource=feed')).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('cannot be pointed anywhere else', async () => {
    for (const query of [
      'resource=other',
      'resource=alert',
      'resource=alert&identifier=1%26x%3Dy',
      'resource=polygon&identifier=../../etc',
      'url=https://example.com',
    ]) {
      expect((await relay(query)).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers 502 when SACHET does not, so the API retries', async () => {
    upstream.mockRejectedValue(new TypeError('fetch failed'));

    expect((await relay('resource=feed')).status).toBe(502);
  });
});
