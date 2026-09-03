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
