import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok } from 'neverthrow';

const mockFetchText = jest.fn<(url: string, options?: unknown) => Promise<unknown>>();
const mockEnv: { SACHET_RELAY_URL?: string; SACHET_RELAY_KEY?: string } = {};

jest.unstable_mockModule('../../../utils/http.js', () => ({ fetchText: mockFetchText }));
jest.unstable_mockModule('../../../config/env.js', () => ({ env: mockEnv }));

const { fetchSachet } = await import('./sachet.connector.js');

const RELAY = 'https://www.pahadpulse.live/api/relay/sachet';
const KEY = 'k'.repeat(40);

beforeEach(() => {
  mockFetchText.mockReset();
  mockFetchText.mockResolvedValue(ok('<rss/>'));
  delete mockEnv.SACHET_RELAY_URL;
  delete mockEnv.SACHET_RELAY_KEY;
});

describe('fetchSachet', () => {
  it('fetches SACHET directly when no relay is configured', async () => {
    await fetchSachet({ resource: 'feed' });
    await fetchSachet({ resource: 'alert', identifier: '1789996329134009' });
    await fetchSachet({ resource: 'polygon', identifier: '1789996329134009' });

    expect(mockFetchText.mock.calls.map(([url]) => url)).toEqual([
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_uttarakhand.xml',
      'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1789996329134009',
      'https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=1789996329134009',
    ]);
  });

  it('asks the relay for the resource by name, with the key, when one is configured', async () => {
    mockEnv.SACHET_RELAY_URL = RELAY;
    mockEnv.SACHET_RELAY_KEY = KEY;

    await fetchSachet({ resource: 'feed' });
    await fetchSachet({ resource: 'polygon', identifier: '1789996329134009' });

    expect(mockFetchText.mock.calls.map(([url]) => url)).toEqual([
      `${RELAY}?resource=feed`,
      `${RELAY}?resource=polygon&identifier=1789996329134009`,
    ]);
    expect(mockFetchText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { 'x-relay-key': KEY } }),
    );
  });
});
