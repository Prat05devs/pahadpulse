import type { ErrorEnvelope, SuccessEnvelope } from '../types/api.js';
import type { Paginated } from '../types/pagination.js';

function isPaginated<T>(payload: T | Paginated<T>): payload is Paginated<T> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'pagination' in payload &&
    Array.isArray(payload.data)
  );
}

export function successResponse<T>(
  payload: T | Paginated<T>,
  message = 'Operation successful',
): SuccessEnvelope<T> | SuccessEnvelope<T[]> {
  if (isPaginated(payload)) {
    return {
      success: true,
      message,
      data: payload.data,
      pagination: payload.pagination,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    success: true,
    message,
    data: payload,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message: string, code: number, requestId?: string): ErrorEnvelope {
  return {
    success: false,
    error: { code, message },
    ...(requestId === undefined ? {} : { requestId }),
    timestamp: new Date().toISOString(),
  };
}
