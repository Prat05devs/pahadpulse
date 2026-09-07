/**
 * Turn an unknown thrown value into something a JSON log will actually show.
 *
 * `logger.error('...', { error })` on an `Error` logs `{"error":{}}`. `message` and `stack`
 * are non-enumerable, so `JSON.stringify` skips them and the log records only that something
 * failed — not what. That is exactly what happened on the first Supabase deploy: the API
 * exited with `{"error":{},"message":"startup failed"}` and the cause was unknowable from
 * production logs.
 *
 * Postgres errors carry their most useful diagnostics in driver-specific fields (`code`,
 * `detail`, `constraint`, `schema`, `table`), which are equally invisible for the same
 * reason, so those are lifted too when present.
 *
 * The stack is included: this is used at failure sites, where the trace is the point.
 */
export interface DescribedError {
  name: string;
  message: string;
  stack?: string;
  /** Postgres SQLSTATE, e.g. `22P02`, or a Node system code such as `ENOTFOUND`. */
  code?: string;
  detail?: string;
  constraint?: string;
  cause?: DescribedError;
}

/** Fields `pg` attaches to a `DatabaseError`, all non-enumerable on the prototype chain. */
function pgFields(error: object): Pick<DescribedError, 'code' | 'detail' | 'constraint'> {
  const candidate = error as { code?: unknown; detail?: unknown; constraint?: unknown };
  return {
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    ...(typeof candidate.detail === 'string' ? { detail: candidate.detail } : {}),
    ...(typeof candidate.constraint === 'string' ? { constraint: candidate.constraint } : {}),
  };
}

export function describeError(error: unknown): DescribedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack !== undefined ? { stack: error.stack } : {}),
      ...pgFields(error),
      // A wrapped error is usually the one that explains the failure — a TLS or DNS fault
      // under a generic "connection failed" — so the chain is followed rather than dropped.
      ...(error.cause !== undefined && error.cause !== null
        ? { cause: describeError(error.cause) }
        : {}),
    };
  }

  // Not an Error: a thrown string, a rejected non-Error, a Zod issue array.
  return {
    name: typeof error,
    message: typeof error === 'string' ? error : JSON.stringify(error) || String(error),
  };
}
