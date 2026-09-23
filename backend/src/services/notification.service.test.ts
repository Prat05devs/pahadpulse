import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok } from 'neverthrow';

import type { DeviceTokenRow, PendingAlertRow } from '../models/device.model.js';
import type { IDeviceRepository } from '../repositories/device.repository.js';

const mockRepo: jest.Mocked<IDeviceRepository> = {
  register: jest.fn(),
  unregister: jest.fn(),
  listActiveTokens: jest.fn(),
  disableTokens: jest.fn(),
  listPendingAlerts: jest.fn(),
  markNotified: jest.fn(),
  settleUnnotifiable: jest.fn(),
};

jest.unstable_mockModule('../repositories/device.repository.js', () => ({
  DeviceRepository: mockRepo,
}));

const { buildMessage, dispatchNewAlerts } = await import('./notification.service.js');

const fetchMock = jest.fn<typeof fetch>();

function alert(overrides: Partial<PendingAlertRow> = {}): PendingAlertRow {
  return {
    id: 1,
    headline: 'Heavy rainfall expected in the next 3 hours',
    severity: 'severe',
    type: 'weather',
    issued_at: '2026-09-23 06:00:00',
    expires_at: '2026-09-23 09:00:00',
    area_names: ['Chamoli', 'Rudraprayag'],
    ...overrides,
  };
}

function device(token: string, language: 'en' | 'hi' = 'en'): DeviceTokenRow {
  return {
    id: 1,
    token,
    platform: 'android',
    language,
    disabled_at: null,
    created_at: '2026-09-23 00:00:00',
    updated_at: '2026-09-23 00:00:00',
  };
}

function expoReplies(tickets: { status: 'ok' | 'error'; details?: { error: string } }[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: tickets }),
  } as Response);
}

beforeEach(() => {
  for (const fn of Object.values(mockRepo)) fn.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock;

  mockRepo.settleUnnotifiable.mockResolvedValue(ok(0));
  mockRepo.markNotified.mockResolvedValue(ok(undefined));
  mockRepo.disableTokens.mockResolvedValue(ok(0));
  mockRepo.listActiveTokens.mockResolvedValue(ok([device('ExponentPushToken[aaa]')]));
  mockRepo.listPendingAlerts.mockResolvedValue(ok([alert()]));
  fetchMock.mockReturnValue(expoReplies([{ status: 'ok' }]));
});

describe('buildMessage', () => {
  it('names the severity and the districts, and keeps the authority’s own headline', () => {
    expect(buildMessage(alert(), 'en')).toEqual({
      title: 'Severe warning · Chamoli, Rudraprayag',
      body: 'Heavy rainfall expected in the next 3 hours',
    });
  });

  it('summarises a long district list rather than filling the lock screen', () => {
    const many = alert({ area_names: ['Almora', 'Bageshwar', 'Chamoli', 'Nainital'] });
    expect(buildMessage(many, 'en').title).toBe('Severe warning · Almora, Bageshwar +2');
  });

  it('falls back to the state when the warning names no district', () => {
    expect(buildMessage(alert({ area_names: null }), 'en').title).toBe(
      'Severe warning · Uttarakhand',
    );
  });

  it('writes the wording in the reader’s language', () => {
    expect(buildMessage(alert(), 'hi').title).toContain('गंभीर चेतावनी');
  });

  /** A severity the API adds later must not crash the dispatch. */
  it('uses a neutral label for a severity it has never seen', () => {
    expect(buildMessage(alert({ severity: 'catastrophic' }), 'en').title).toContain('Public alert');
  });
});

describe('dispatchNewAlerts', () => {
  it('sends one message per device and records the alert as announced', async () => {
    const result = await dispatchNewAlerts();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result._unsafeUnwrap()).toMatchObject({ alerts: 1, delivered: 1 });
    expect(mockRepo.markNotified).toHaveBeenCalledWith([1]);
  });

  it('does nothing when no warning is waiting', async () => {
    mockRepo.listPendingAlerts.mockResolvedValue(ok([]));

    const result = await dispatchNewAlerts();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result._unsafeUnwrap().alerts).toBe(0);
  });

  /** Otherwise every tick re-reads the same warnings for a registry nobody is in. */
  it('marks warnings announced even when no device is registered', async () => {
    mockRepo.listActiveTokens.mockResolvedValue(ok([]));

    await dispatchNewAlerts();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockRepo.markNotified).toHaveBeenCalledWith([1]);
  });

  it('retires a token Expo says no longer exists', async () => {
    fetchMock.mockReturnValue(
      expoReplies([{ status: 'error', details: { error: 'DeviceNotRegistered' } }]),
    );

    await dispatchNewAlerts();

    expect(mockRepo.disableTokens).toHaveBeenCalledWith(['ExponentPushToken[aaa]']);
  });

  /**
   * The safe direction for a warning: a push service that is down must not cost the reader
   * the notification, so the alert stays unannounced and the next tick tries again.
   */
  it('leaves the warning unannounced when the push service cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const result = await dispatchNewAlerts();

    expect(result._unsafeUnwrap().delivered).toBe(0);
    expect(mockRepo.disableTokens).toHaveBeenCalledWith([]);
  });
});
