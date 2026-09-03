import type { PageInfo } from './pagination.js';

export interface SuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  pagination?: PageInfo;
  timestamp: string;
}

export interface ErrorEnvelope {
  success: false;
  error: { code: number; message: string };
  requestId?: string;
  timestamp: string;
}
