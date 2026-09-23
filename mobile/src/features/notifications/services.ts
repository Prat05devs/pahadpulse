import { apiClient } from '@/lib/api';
import { z } from 'zod';

/**
 * The device registry: the server needs somewhere to send a warning, and nothing else.
 *
 * No account and nothing identifying: the push token the OS issued, which platform it is,
 * and which language to write the wording in. Unregistering deletes the row, so switching
 * notifications off is a deletion rather than a flag the server keeps.
 */
const AckSchema = z.null();

export interface RegisterDeviceInput {
  token: string;
  platform: 'ios' | 'android';
  language: 'en' | 'hi';
}

export async function registerDevice(input: RegisterDeviceInput): Promise<void> {
  await apiClient.post('/devices', input, AckSchema);
}

export async function unregisterDevice(token: string): Promise<void> {
  await apiClient.post('/devices/unregister', { token }, AckSchema);
}
