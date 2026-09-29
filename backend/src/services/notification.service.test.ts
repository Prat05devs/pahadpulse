import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok } from 'neverthrow';

import type {
  DeviceTokenRow,
  PendingAlertRow,
  PushNotificationTicketRow,
} from '../models/device.model.js';
import type { IDeviceRepository } from '../repositories/device.repository.js';

const mockRepo: jest.Mocked<IDeviceRepository> = {
  register: jest.fn(),
  unregister: jest.fn(),
  listActiveTokens: jest.fn(),
  disableTokens: jest.fn(),
  savePushTickets: jest.fn(),
  listPendingPushTickets: jest.fn(),
  deletePushTickets: jest.fn(),
  prunePushTickets: jest.fn(),
  listPendingAlerts: jest.fn(),
  markNotified: jest.fn(),
  settleUnnotifiable: jest.fn(),
};

jest.unstable_mockModule('../repositories/device.repository.js', () => ({
  DeviceRepository: mockRepo,
}));

const { buildMessage, dispatchNewAlerts, reconcilePushReceipts } =
  await import('./notification.service.js');

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

function pushTicket(overrides: Partial<PushNotificationTicketRow> = {}): PushNotificationTicketRow {
  return {
    ticket_id: 'ticket-0',
    device_token: 'ExponentPushToken[aaa]',
    created_at: '2026-09-23 06:00:00',
    ...overrides,
  };
}

function expoReplies(tickets: { status: 'ok' | 'error'; details?: { error: string } }[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        data: tickets.map((ticket, index) =>
          ticket.status === 'ok' ? { ...ticket, id: `ticket-${index}` } : ticket,
        ),
      }),
  } as Response);
}

beforeEach(() => {
  for (const fn of Object.values(mockRepo)) fn.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock;

  mockRepo.settleUnnotifiable.mockResolvedValue(ok(0));
  mockRepo.markNotified.mockResolvedValue(ok(undefined));
  mockRepo.disableTokens.mockResolvedValue(ok(0));
  mockRepo.savePushTickets.mockResolvedValue(ok(0));
  mockRepo.listPendingPushTickets.mockResolvedValue(ok([]));
  mockRepo.deletePushTickets.mockResolvedValue(ok(0));
  mockRepo.prunePushTickets.mockResolvedValue(ok(0));
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
    expect(result._unsafeUnwrap()).toMatchObject({ alerts: 1, accepted: 1 });
    expect(mockRepo.markNotified).toHaveBeenCalledWith([1]);
    expect(mockRepo.savePushTickets).toHaveBeenCalledWith([
      { ticketId: 'ticket-0', token: 'ExponentPushToken[aaa]' },
    ]);
    const request = fetchMock.mock.calls[0]?.[1];
    const messages = JSON.parse(String(request?.body)) as Record<string, unknown>[];
    expect(messages[0]).toMatchObject({
      sound: 'default',
      priority: 'high',
      channelId: 'alerts',
      data: { alertId: 1, url: '/alerts/1' },
    });
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

    expect(result._unsafeUnwrap().accepted).toBe(0);
    // The warning is NOT recorded as announced: the next pass must try again.
    expect(mockRepo.markNotified).toHaveBeenCalledWith([]);
  });

  it('retries when Expo returns no ticket list', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ errors: [{ message: 'temporary failure' }] }),
    } as Response);

    await dispatchNewAlerts();

    expect(mockRepo.markNotified).toHaveBeenCalledWith([]);
  });

  it('retries when Expo returns fewer tickets than messages', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    await dispatchNewAlerts();

    expect(mockRepo.markNotified).toHaveBeenCalledWith([]);
  });

  /**
   * The opposite case, and the reason the two are told apart: Expo accepted the request and
   * rejected one token. Re-sending would duplicate the notification on every phone that did
   * receive it, so the warning counts as announced.
   */
  it('records the warning as announced when the push service answered, whatever the tickets said', async () => {
    fetchMock.mockReturnValue(
      expoReplies([{ status: 'error', details: { error: 'MessageRateExceeded' } }]),
    );

    await dispatchNewAlerts();

    expect(mockRepo.markNotified).toHaveBeenCalledWith([1]);
  });
});

describe('reconcilePushReceipts', () => {
  beforeEach(() => {
    mockRepo.listPendingPushTickets.mockResolvedValue(ok([pushTicket()]));
  });

  it('removes a ticket after Expo confirms the provider accepted it', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { 'ticket-0': { status: 'ok' } } }),
    } as Response);
    mockRepo.deletePushTickets.mockResolvedValue(ok(1));

    const result = await reconcilePushReceipts();

    expect(mockRepo.deletePushTickets).toHaveBeenCalledWith(['ticket-0']);
    expect(result._unsafeUnwrap()).toMatchObject({ resolved: 1, tokensDisabled: 0 });
  });

  it('retires a device rejected by APNs or FCM', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            'ticket-0': {
              status: 'error',
              message: 'The device is not registered',
              details: { error: 'DeviceNotRegistered' },
            },
          },
        }),
    } as Response);
    mockRepo.disableTokens.mockResolvedValue(ok(1));
    mockRepo.deletePushTickets.mockResolvedValue(ok(1));

    const result = await reconcilePushReceipts();

    expect(mockRepo.disableTokens).toHaveBeenCalledWith(['ExponentPushToken[aaa]']);
    expect(result._unsafeUnwrap()).toMatchObject({ resolved: 1, tokensDisabled: 1 });
  });

  it('keeps a ticket when Expo has not produced its receipt yet', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    } as Response);

    await reconcilePushReceipts();

    expect(mockRepo.deletePushTickets).toHaveBeenCalledWith([]);
    expect(mockRepo.disableTokens).toHaveBeenCalledWith([]);
  });

  it('keeps tickets for retry when the receipt service is unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const result = await reconcilePushReceipts();

    expect(mockRepo.deletePushTickets).not.toHaveBeenCalled();
    expect(result._unsafeUnwrap().resolved).toBe(0);
  });
});
