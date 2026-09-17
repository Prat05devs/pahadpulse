import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { RunStatus } from '../types/dataset.js';
import { ERRORS } from '../utils/errors.js';

type QueryFn = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

const clientQuery = jest.fn<QueryFn>();
const clientRelease = jest.fn();
const poolQuery = jest.fn<QueryFn>();

jest.unstable_mockModule('../database/db.js', () => ({
  db: {
    connect: () => Promise.resolve({ query: clientQuery, release: clientRelease }),
    query: poolQuery,
  },
}));

const { SourceRepository } = await import('./source.repository.js');

/** The SQL statements sent on the transaction client, whitespace-collapsed, in order. */
function sentStatements(): string[] {
  return clientQuery.mock.calls.map(([text]) => text.replace(/\s+/g, ' ').trim());
}

beforeEach(() => {
  clientQuery.mockReset();
  clientRelease.mockReset();
  poolQuery.mockReset();
});

describe('SourceRepository.startRun', () => {
  /**
   * The race this guards: with no run in flight, `FOR UPDATE` on the in-flight query
   * matches zero rows and locks nothing, so two concurrent starts would both insert.
   * Locking the source row BEFORE that check is what serialises them.
   */
  it('locks the source row before checking for an in-flight run', async () => {
    clientQuery.mockImplementation((text) =>
      Promise.resolve({ rows: text.includes('RETURNING id') ? [{ id: 7 }] : [] }),
    );

    const result = await SourceRepository.startRun(3, 'cli');

    expect(result._unsafeUnwrap()).toBe(7);
    const statements = sentStatements();
    const lockIndex = statements.findIndex((sql) =>
      /FROM sources WHERE id = \$1 FOR UPDATE/.test(sql),
    );
    const checkIndex = statements.findIndex((sql) => sql.includes('FROM ingestion_runs'));
    const insertIndex = statements.findIndex((sql) => sql.startsWith('INSERT INTO ingestion_runs'));

    expect(statements[0]).toBe('BEGIN');
    expect(lockIndex).toBe(1);
    expect(checkIndex).toBeGreaterThan(lockIndex);
    expect(insertIndex).toBeGreaterThan(checkIndex);
    expect(clientQuery.mock.calls[lockIndex]?.[1]).toEqual([3]);
    expect(statements.at(-1)).toBe('COMMIT');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  it('refuses without inserting when a run is already in flight', async () => {
    clientQuery.mockImplementation((text) =>
      Promise.resolve({ rows: text.includes('FROM ingestion_runs') ? [{ id: 99 }] : [] }),
    );

    const result = await SourceRepository.startRun(3, 'scheduler');

    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.INGESTION_RUN_IN_PROGRESS.code);
    expect(sentStatements().some((sql) => sql.startsWith('INSERT'))).toBe(false);
    expect(sentStatements().at(-1)).toBe('ROLLBACK');
  });
});

describe('SourceRepository.completeRun', () => {
  const base = {
    runId: 5,
    status: RunStatus.Failed,
    rowsWritten: 0,
    rowsRejected: 0,
    errorCode: 50001,
    vintage: null,
  };

  /** `notes` is VARCHAR(1024); an over-long upstream message must not fail the UPDATE. */
  it('trims notes to the column length', async () => {
    poolQuery.mockResolvedValue({ rows: [] });

    const result = await SourceRepository.completeRun({ ...base, notes: 'x'.repeat(5000) });

    expect(result.isOk()).toBe(true);
    const params = poolQuery.mock.calls[0]?.[1] ?? [];
    expect(params[4]).toBe('x'.repeat(1024));
  });

  it('keeps null notes null', async () => {
    poolQuery.mockResolvedValue({ rows: [] });

    await SourceRepository.completeRun({ ...base, notes: null });

    expect(poolQuery.mock.calls[0]?.[1]?.[4]).toBeNull();
  });
});
