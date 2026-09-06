/**
 * Small SQL builders for the things `pg` does not give us that `mysql2` did.
 *
 * mysql2 accepted `VALUES ?` with an array of arrays and expanded it into a multi-row
 * insert. `pg` has no equivalent — every value must be its own numbered placeholder — so
 * the expansion is done here, once, rather than in the six repositories that bulk insert.
 *
 * Deliberately NOT an abstraction over queries: these return a fragment and a flat
 * parameter list, and the caller still writes its own SQL. Raw parameterised SQL is the
 * house rule (guidelines/common/13), and this only supplies the placeholder arithmetic.
 */

export interface ValuesFragment {
  /** `($1, $2, $3), ($4, $5, $6)` — ready to follow `VALUES`. */
  text: string;
  /** The values, flattened in the order the placeholders reference them. */
  params: unknown[];
}

/**
 * Expands rows into a multi-row VALUES clause.
 *
 * `startAt` shifts the numbering for a statement that already has parameters before this
 * clause, so a caller with a leading `WHERE` argument does not collide with the rows.
 *
 * Throws on ragged input rather than emitting SQL whose placeholders and parameters
 * disagree: that mismatch produces either a syntax error at run time or, worse, values
 * silently landing in the wrong columns.
 */
export function bulkValues(rows: readonly unknown[][], startAt = 1): ValuesFragment {
  if (rows.length === 0) return { text: '', params: [] };

  const width = rows[0]?.length ?? 0;
  if (width === 0) throw new Error('bulkValues: rows must have at least one column');

  const params: unknown[] = [];
  const tuples: string[] = [];
  let next = startAt;

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(
        `bulkValues: ragged rows — expected ${width} columns, got ${row.length}`,
      );
    }
    tuples.push(`(${row.map(() => `$${next++}`).join(', ')})`);
    params.push(...row);
  }

  return { text: tuples.join(', '), params };
}

/**
 * `SET col = EXCLUDED.col, ...` for an upsert.
 *
 * Postgres exposes the row that failed to insert as `EXCLUDED`, which is the direct
 * counterpart of the `new` alias MySQL's `ON DUPLICATE KEY UPDATE ... AS new` used.
 */
export function excludedSet(columns: readonly string[]): string {
  return columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
}
