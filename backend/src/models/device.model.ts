export const DEVICE_TOKENS_TABLE = 'device_tokens';

export type DevicePlatform = 'ios' | 'android';
export type DeviceLanguage = 'en' | 'hi';

/** A row as the driver returns it. Timestamps are naive UTC strings, as everywhere else. */
export interface DeviceTokenRow {
  id: number;
  token: string;
  platform: DevicePlatform;
  language: DeviceLanguage;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** One warning waiting to be announced, with what the notification needs to say it. */
export interface PendingAlertRow {
  id: number;
  headline: string;
  severity: string;
  type: string;
  issued_at: string;
  expires_at: string | null;
  area_names: string[] | null;
}
