export class RequestError extends Error {
  readonly code: number;
  readonly statusCode: number;

  constructor(message: string, code: number, statusCode: number) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) Error.captureStackTrace(this, RequestError);
  }
}

export function isRequestError(e: unknown): e is RequestError {
  return e instanceof RequestError;
}

/**
 * The central error registry. Nothing constructs a RequestError inline.
 *
 * Ranges (see project/overview.md § Global constraints):
 *   1xxxx common · 2xxxx auth · 30xxx accounts · 40xxx geography · 50xxx indicators
 *   55xxx migration · 60xxx alerts · 70xxx hydromet · 80xxx roads · 85xxx tourism
 *   90xxx datasets · 95xxx governance
 *
 * Codes are immutable once shipped. Allocate the next free number; gaps are fine.
 */
export const ERRORS = {
  // 1xxxx — common
  DATABASE_ERROR: new RequestError('Database operation failed', 10001, 500),
  INVALID_REQUEST_BODY: new RequestError('Invalid request body', 10002, 400),
  INVALID_QUERY_PARAMETER: new RequestError('Invalid query parameters', 10003, 400),
  UNHANDLED_ERROR: new RequestError('An unexpected error occurred', 10004, 500),
  INTERNAL_SERVER_ERROR: new RequestError('Internal server error', 10005, 500),
  ROUTE_NOT_FOUND: new RequestError('Route not found', 10006, 404),
  INVALID_PARAMS: new RequestError('Invalid parameters', 10007, 400),
  VALIDATION_ERROR: new RequestError('Validation failed', 10008, 422),
  RESOURCE_NOT_FOUND: new RequestError('Resource not found', 10009, 404),
  DUPLICATE_RESOURCE: new RequestError('Resource already exists', 10010, 409),
  RATE_LIMITED: new RequestError('Too many requests', 10011, 429),
  PAYLOAD_TOO_LARGE: new RequestError('Payload too large', 10012, 413),

  // 40xxx — geography
  AREA_NOT_FOUND: new RequestError('Area not found', 40001, 404),
  BOUNDARY_NOT_AVAILABLE: new RequestError('Boundary not available for this area', 40002, 404),
  AREA_TYPE_NOT_SUPPORTED: new RequestError('Area type not supported', 40003, 400),

  // 90xxx — datasets (upstream and ingestion failures)
  SOURCE_NOT_FOUND: new RequestError('Data source not found', 90001, 404),
  UPSTREAM_UNAVAILABLE: new RequestError('Upstream data source is unavailable', 90002, 502),
  UPSTREAM_RESPONSE_INVALID: new RequestError(
    'Upstream data source returned an unexpected response',
    90003,
    502,
  ),
  UPSTREAM_RATE_LIMITED: new RequestError(
    'Upstream data source rate limited the request',
    90004,
    429,
  ),
  INGESTION_RUN_IN_PROGRESS: new RequestError(
    'An ingestion run is already in progress for this source',
    90005,
    409,
  ),
  SOURCE_NOT_REDISTRIBUTABLE: new RequestError(
    'This source may not be redistributed publicly',
    90006,
    403,
  ),
  CONNECTOR_NOT_AVAILABLE: new RequestError(
    'No connector is available for this source',
    90007,
    501,
  ),

  // 50xxx — indicators
  INDICATOR_NOT_FOUND: new RequestError('Indicator not found', 50001, 404),
  INDICATOR_VALUE_NOT_AVAILABLE: new RequestError(
    'No value is available for this indicator',
    50002,
    404,
  ),
  COMPARISON_AREA_TYPE_MISMATCH: new RequestError(
    'Both areas must be of the same type to compare',
    50003,
    400,
  ),
  COMPARISON_REQUIRES_TWO_AREAS: new RequestError(
    'Comparison requires exactly two areas',
    50004,
    400,
  ),
  INDICATOR_SCOPE_NOT_SUPPORTED: new RequestError(
    'This indicator does not support the requested area type',
    50005,
    400,
  ),

  // 60xxx — alerts
  ALERT_NOT_FOUND: new RequestError('Alert not found', 60001, 404),
  ALERT_EXPIRED: new RequestError('This alert has expired', 60002, 410),
  ALERT_AREA_UNRESOLVED: new RequestError('Alert area could not be resolved', 60004, 422),
  ALERT_SEVERITY_INVALID: new RequestError('Invalid alert severity', 60005, 400),
} as const;
