import { secureStorage } from '@/lib/storage';

import {
  registerNotificationDevice,
  unregisterRememberedNotificationDevices,
} from './registration';
import { registerDevice, unregisterDevice } from './services';

jest.mock('@/lib/storage', () => ({
  STORAGE_KEYS: {
    notificationToken: 'notification-token',
    notificationTokensPendingRemoval: 'notification-pending',
  },
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

jest.mock('./services', () => ({
  registerDevice: jest.fn(),
  unregisterDevice: jest.fn(),
}));

const mockStored = new Map<string, string>();
const mockGet = jest.mocked(secureStorage.get);
const mockSet = jest.mocked(secureStorage.set);
const mockRemove = jest.mocked(secureStorage.remove);
const mockRegisterDevice = jest.mocked(registerDevice);
const mockUnregisterDevice = jest.mocked(unregisterDevice);

beforeEach(() => {
  mockStored.clear();
  mockGet.mockReset().mockImplementation(async (key) => mockStored.get(key) ?? null);
  mockSet.mockReset().mockImplementation(async (key, value) => {
    mockStored.set(key, value);
  });
  mockRemove.mockReset().mockImplementation(async (key) => {
    mockStored.delete(key);
  });
  mockRegisterDevice.mockReset().mockResolvedValue(undefined);
  mockUnregisterDevice.mockReset().mockResolvedValue(undefined);
});

describe('notification registration persistence', () => {
  it('remembers a successfully registered token', async () => {
    await registerNotificationDevice({
      token: 'ExpoPushToken[new]',
      platform: 'ios',
      language: 'en',
    });

    expect(mockRegisterDevice).toHaveBeenCalledWith({
      token: 'ExpoPushToken[new]',
      platform: 'ios',
      language: 'en',
    });
    expect(mockStored.get('notification-token')).toBe('ExpoPushToken[new]');
  });

  it('registers a rotated token before retiring the old one', async () => {
    mockStored.set('notification-token', 'ExpoPushToken[old]');

    await registerNotificationDevice({
      token: 'ExpoPushToken[new]',
      platform: 'android',
      language: 'hi',
    });

    expect(mockRegisterDevice.mock.invocationCallOrder[0]).toBeLessThan(
      mockUnregisterDevice.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    expect(mockUnregisterDevice).toHaveBeenCalledWith('ExpoPushToken[old]');
    expect(mockStored.get('notification-token')).toBe('ExpoPushToken[new]');
    expect(mockStored.has('notification-pending')).toBe(false);
  });

  it('keeps a failed unsubscribe for the next attempt', async () => {
    mockStored.set('notification-token', 'ExpoPushToken[current]');
    mockUnregisterDevice.mockRejectedValueOnce(new Error('offline'));

    await unregisterRememberedNotificationDevices();

    expect(mockStored.get('notification-token')).toBe('ExpoPushToken[current]');
    expect(JSON.parse(mockStored.get('notification-pending') ?? '[]')).toEqual([
      'ExpoPushToken[current]',
    ]);

    await unregisterRememberedNotificationDevices();

    expect(mockUnregisterDevice).toHaveBeenCalledTimes(2);
    expect(mockStored.has('notification-token')).toBe(false);
    expect(mockStored.has('notification-pending')).toBe(false);
  });
});
