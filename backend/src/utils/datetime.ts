/**
 * Converts an ISO-8601 timestamp (with any offset, e.g. CAP's `+05:30`) to the
 * `YYYY-MM-DD HH:MM:SS` UTC string MySQL's DATETIME columns expect.
 *
 * A DATETIME column is timezone-naive: binding a string with a trailing offset directly
 * would either be rejected or silently mis-stored. This is the one place that conversion
 * happens, for every connector that ingests a source-supplied timestamp.
 *
 * Returns null on anything unparseable — never a fabricated timestamp.
 */
export function toMysqlUtcDatetime(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}

/** The `YYYY-MM-DD` portion, for use as a `vintage` date. Null on anything unparseable. */
export function toDateOnly(iso: string | null): string | null {
  const datetime = toMysqlUtcDatetime(iso);
  return datetime === null ? null : datetime.slice(0, 10);
}

/**
 * The inverse of `toMysqlUtcDatetime`: turns the `YYYY-MM-DD HH:MM:SS` the driver hands
 * back (the pool runs `dateStrings: true`) into an ISO-8601 instant for the API.
 *
 * The `Z` is the entire point. A DATETIME column is timezone-naive and the pool stores UTC
 * by contract, but a bare `2026-09-06 12:15:00` on the wire is parsed as LOCAL time by
 * every browser that receives it — which in India silently shifts every timestamp by five
 * and a half hours. Stamping the zone is what stops a reading taken at noon displaying as
 * half past five.
 *
 * Returns null on anything unparseable — never a fabricated timestamp.
 */
export function toIsoUtc(mysqlDatetime: string | null): string | null {
  if (mysqlDatetime === null) return null;
  // Anything already carrying a zone (trailing `Z`, or a `+05:30`/`-08:00` offset) is
  // self-describing and parsed as-is. Everything else is a naive column value, which by
  // the pool's contract is UTC — so it is told so explicitly rather than left to the
  // runtime's local zone.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(mysqlDatetime);
  const normalised = hasZone ? mysqlDatetime : `${mysqlDatetime.replace(' ', 'T')}Z`;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
