import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const warn = jest.fn();

jest.unstable_mockModule('./logger.js', () => ({
  default: () => ({ warn, info: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const { fetchText } = await import('./http.js');

const fetchMock = jest.fn<typeof fetch>();

beforeEach(() => {
  warn.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe('fetchText redaction', () => {
  /** FIRMS puts its map key in the URL path; a log line must never carry it. */
  it('masks redacted values in the URL it logs', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as Response);

    await fetchText('https://firms.example/api/area/csv/SECRETKEY123/MODIS_NRT', {
      retries: 0,
      redact: ['SECRETKEY123'],
    });

    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRETKEY123');
    expect(JSON.stringify(warn.mock.calls)).toContain('[redacted]');
  });

  it('masks it in transport failures too', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await fetchText('https://firms.example/api/area/csv/SECRETKEY123/MODIS_NRT', {
      retries: 0,
      redact: ['SECRETKEY123'],
    });

    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRETKEY123');
  });
});
