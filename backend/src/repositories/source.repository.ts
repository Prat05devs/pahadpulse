import { err, ok, type Result } from 'neverthrow';

import { INGESTION_RUN_TIMEOUT_SECONDS } from '../config/constants.js';
import { db } from '../database/db.js';
import {
  INGESTION_RUNS_TABLE,
  SOURCES_TABLE,
  type IngestionRun,
  type IngestionRunRow,
  type Source,
  type SourceRow,
  type SourceWithRunRow,
} from '../models/source.model.js';
import { RunStatus } from '../types/dataset.js';
import type { Paginated } from '../types/pagination.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import { freshnessOf } from '../utils/freshness.js';
import createLogger from '../utils/logger.js';
import { toPage } from '../utils/pagination.js';
import { describeError } from '../utils/describe-error.js';

const logger = createLogger('@source.repository');

const SOURCE_COLUMNS = `
  s.id, s.source_key, s.owner_module, s.department_en, s.department_hi, s.url,
  s.attribution, s.licence, s.access_method, s.cadence, s.may_redistribute,
  s.metadata_status, s.metadata_note, s.is_enabled, s.updated_at
`;

/**
 * Each source joined to its last successful run and its most recent run of any status.
 * Correlated subqueries rather than N follow-up queries (Q5).
 */
const LAST_RUN_COLUMNS = `
  (SELECT r.started_at FROM ${INGESTION_RUNS_TABLE} r
    WHERE r.source_id = s.id AND r.status IN ('succeeded','partial_success')
    ORDER BY r.started_at DESC LIMIT 1) AS last_success_at,
  (SELECT r.vintage FROM ${INGESTION_RUNS_TABLE} r
    WHERE r.source_id = s.id AND r.status IN ('succeeded','partial_success')
    ORDER BY r.started_at DESC LIMIT 1) AS last_vintage,
  (SELECT r.status FROM ${INGESTION_RUNS_TABLE} r
    WHERE r.source_id = s.id ORDER BY r.started_at DESC LIMIT 1) AS last_run_status,
  (SELECT r.started_at FROM ${INGESTION_RUNS_TABLE} r
    WHERE r.source_id = s.id ORDER BY r.started_at DESC LIMIT 1) AS last_run_at
`;

/** The driver returns DATETIME as a UTC string (dateStrings + pool timezone Z). */
function parseUtc(value: string | null): Date | null {
  if (value === null) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toSource(row: SourceWithRunRow, now: Date): Source {
  return {
    key: row.source_key,
    ownerModule: row.owner_module,
    department: { en: row.department_en, hi: row.department_hi },
    url: row.url,
    attribution: row.attribution,
    licence: row.licence,
    accessMethod: row.access_method,
    cadence: row.cadence,
    mayRedistribute: Boolean(row.may_redistribute),
    metadataStatus: row.metadata_status,
    freshness: freshnessOf(row.cadence, parseUtc(row.last_success_at), now),
    lastSuccessAt: row.last_success_at,
    lastVintage: row.last_vintage,
    lastRunStatus: row.last_run_status,
    lastRunAt: row.last_run_at,
  };
}

function toRun(row: IngestionRunRow): IngestionRun {
  return {
    id: row.id,
    sourceKey: row.source_key,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    rowsWritten: row.rows_written,
    rowsRejected: row.rows_rejected,
    errorCode: row.error_code,
    notes: row.notes,
    vintage: row.vintage,
    triggeredBy: row.triggered_by,
  };
}

export interface CompleteRunInput {
  runId: number;
  status: RunStatus;
  rowsWritten: number;
  rowsRejected: number;
  errorCode: number | null;
  notes: string | null;
  vintage: string | null;
}

export interface ISourceRepository {
  listAll(now?: Date): Promise<Result<Source[], RequestError>>;
  findByKey(key: string, now?: Date): Promise<Result<Source, RequestError>>;
  findRowByKey(key: string): Promise<Result<SourceRow, RequestError>>;
  findByIds(ids: readonly number[], now?: Date): Promise<Result<Map<number, Source>, RequestError>>;
  startRun(sourceId: number, triggeredBy: string): Promise<Result<number, RequestError>>;
  completeRun(input: CompleteRunInput): Promise<Result<void, RequestError>>;
  listRuns(
    cursor: number,
    limit: number,
    sourceKey?: string,
  ): Promise<Result<Paginated<IngestionRun>, RequestError>>;
  expireStuckRuns(): Promise<Result<number, RequestError>>;
}

class SourceRepositoryImpl implements ISourceRepository {
  async listAll(now: Date = new Date()): Promise<Result<Source[], RequestError>> {
    try {
      const { rows } = await db.query<SourceWithRunRow>(
        `SELECT ${SOURCE_COLUMNS}, ${LAST_RUN_COLUMNS}
           FROM ${SOURCES_TABLE} s
          ORDER BY s.owner_module ASC, s.source_key ASC`,
      );
      return ok(rows.map((row) => toSource(row, now)));
    } catch (error) {
      logger.error('listAll failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findByKey(key: string, now: Date = new Date()): Promise<Result<Source, RequestError>> {
    try {
      const { rows } = await db.query<SourceWithRunRow>(
        `SELECT ${SOURCE_COLUMNS}, ${LAST_RUN_COLUMNS}
           FROM ${SOURCES_TABLE} s WHERE s.source_key = $1 LIMIT 1`,
        [key],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.SOURCE_NOT_FOUND);
      return ok(toSource(row, now));
    } catch (error) {
      logger.error('findByKey failed', { key, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findRowByKey(key: string): Promise<Result<SourceRow, RequestError>> {
    try {
      const { rows } = await db.query<SourceRow>(
        `SELECT ${SOURCE_COLUMNS} FROM ${SOURCES_TABLE} s WHERE s.source_key = $1 LIMIT 1`,
        [key],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.SOURCE_NOT_FOUND);
      return ok(row);
    } catch (error) {
      logger.error('findRowByKey failed', { key, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Batch provenance hydration for a page of domain values (DS-1).
   * One query per page — a per-value lookup would be an N+1 on every dashboard.
   */
  async findByIds(
    ids: readonly number[],
    now: Date = new Date(),
  ): Promise<Result<Map<number, Source>, RequestError>> {
    if (ids.length === 0) return ok(new Map());
    try {
      const { rows } = await db.query<SourceWithRunRow>(
        `SELECT ${SOURCE_COLUMNS}, ${LAST_RUN_COLUMNS}
           FROM ${SOURCES_TABLE} s WHERE s.id = ANY($1::integer[])`,
        [[...ids]],
      );
      return ok(new Map(rows.map((row) => [row.id, toSource(row, now)])));
    } catch (error) {
      logger.error('findByIds failed', { count: ids.length, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Opens a run, refusing if one is already in flight for this source.
   * Guard and insert are one transaction so two schedulers cannot both start.
   */
  async startRun(sourceId: number, triggeredBy: string): Promise<Result<number, RequestError>> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const { rows: running } = await client.query<IngestionRunRow>(
        `SELECT id FROM ${INGESTION_RUNS_TABLE}
          WHERE source_id = $1 AND status = $2
            AND started_at > ((now() AT TIME ZONE 'utc') - ($3 * INTERVAL '1 second'))
          FOR UPDATE`,
        [sourceId, RunStatus.Running, INGESTION_RUN_TIMEOUT_SECONDS],
      );
      if (running.length > 0) {
        await client.query('ROLLBACK');
        return err(ERRORS.INGESTION_RUN_IN_PROGRESS);
      }

      const result = await client.query<{ id: number }>(
        `INSERT INTO ${INGESTION_RUNS_TABLE} (source_id, status, triggered_by, started_at)
         VALUES ($1, $2, $3, (now() AT TIME ZONE 'utc'))
         RETURNING id`,
        [sourceId, RunStatus.Running, triggeredBy],
      );

      const id = result.rows[0]?.id;
      if (id === undefined) throw new Error('insert did not return an id');

      await client.query('COMMIT');
      return ok(id);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('startRun failed', { sourceId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      client.release();
    }
  }

  async completeRun(input: CompleteRunInput): Promise<Result<void, RequestError>> {
    try {
      await db.query(
        `UPDATE ${INGESTION_RUNS_TABLE}
            SET status = $1, rows_written = $2, rows_rejected = $3,
                error_code = $4, notes = $5, vintage = $6, finished_at = (now() AT TIME ZONE 'utc')
          WHERE id = $7`,
        [
          input.status,
          input.rowsWritten,
          input.rowsRejected,
          input.errorCode,
          input.notes,
          input.vintage,
          input.runId,
        ],
      );
      return ok(undefined);
    } catch (error) {
      logger.error('completeRun failed', { runId: input.runId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listRuns(
    cursor: number,
    limit: number,
    sourceKey?: string,
  ): Promise<Result<Paginated<IngestionRun>, RequestError>> {
    try {
      const filterByKey = sourceKey !== undefined;
      const { rows } = await db.query<IngestionRunRow>(
        `SELECT r.id, r.source_id, s.source_key, r.started_at, r.finished_at, r.status,
                r.rows_written, r.rows_rejected, r.error_code, r.notes, r.vintage, r.triggered_by
           FROM ${INGESTION_RUNS_TABLE} r
           JOIN ${SOURCES_TABLE} s ON s.id = r.source_id
          WHERE r.id < $1::bigint
            ${filterByKey ? 'AND s.source_key = $2' : ''}
          ORDER BY r.id DESC
          -- The limit's position depends on whether the optional filter added a parameter,
          -- so it is numbered from the actual argument count rather than hardcoded.
          LIMIT $${filterByKey ? 3 : 2}`,
        filterByKey ? [cursor, sourceKey, limit + 1] : [cursor, limit + 1],
      );
      return ok(toPage(rows.map(toRun), limit));
    } catch (error) {
      logger.error('listRuns failed', { cursor, limit, sourceKey, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Marks abandoned runs failed so a crashed process cannot hold a source forever.
   * A stuck run is a dead run, not a lock (DS-4).
   */
  async expireStuckRuns(): Promise<Result<number, RequestError>> {
    try {
      const result = await db.query(
        `UPDATE ${INGESTION_RUNS_TABLE}
            SET status = $1, finished_at = (now() AT TIME ZONE 'utc'), error_code = $2,
                notes = 'Run abandoned - exceeded the run timeout and was expired.'
          WHERE status = $3
            AND started_at <= ((now() AT TIME ZONE 'utc') - INTERVAL $4 SECOND)`,
        [
          RunStatus.Failed,
          ERRORS.UPSTREAM_UNAVAILABLE.code,
          RunStatus.Running,
          INGESTION_RUN_TIMEOUT_SECONDS,
        ],
      );
      return ok(result.rowCount ?? 0);
    } catch (error) {
      logger.error('expireStuckRuns failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const SourceRepository: ISourceRepository = new SourceRepositoryImpl();
