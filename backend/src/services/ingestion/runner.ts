import { err, ok, type Result } from 'neverthrow';

import { SourceRepository } from '../../repositories/source.repository.js';
import { RunStatus } from '../../types/dataset.js';
import { ERRORS, isRequestError, type RequestError } from '../../utils/errors.js';
import createLogger from '../../utils/logger.js';
import { getConnector, type ConnectorOutcome } from './connector.js';

const logger = createLogger('@ingestion.runner');

export interface RunReport {
  sourceKey: string;
  runId: number | null;
  status: RunStatus | 'skipped';
  rowsWritten: number;
  rowsRejected: number;
  vintage: string | null;
  notes: string | null;
}

/**
 * Runs one source's connector and records the outcome.
 *
 * The two rules that matter here:
 *   DS-4 — a failed run never deletes or invalidates data. It records the failure and
 *          returns; freshness degrades because it is computed from the last SUCCESSFUL run.
 *   DS-5 — idempotency is the connector's job, not the runner's. The runner may re-run a
 *          source freely; the connector must upsert.
 */
export async function runSource(
  sourceKey: string,
  triggeredBy = 'scheduler',
  now: Date = new Date(),
): Promise<Result<RunReport, RequestError>> {
  const source = await SourceRepository.findRowByKey(sourceKey);
  if (source.isErr()) return err(source.error);

  const row = source.value;

  if (row.is_enabled === 0) {
    logger.info('source disabled, skipping', { sourceKey });
    return ok({
      sourceKey,
      runId: null,
      status: 'skipped',
      rowsWritten: 0,
      rowsRejected: 0,
      vintage: null,
      notes: 'Source is disabled in the registry.',
    });
  }

  const connector = getConnector(sourceKey);
  if (connector === undefined) return err(ERRORS.CONNECTOR_NOT_AVAILABLE);

  // Not an error: the connector exists but has no credentials or unverified access yet.
  // Recording this as a failed run would bury real failures in noise.
  if (!connector.isAvailable) {
    logger.info('connector unavailable, skipping', {
      sourceKey,
      reason: connector.unavailableReason,
    });
    return ok({
      sourceKey,
      runId: null,
      status: 'skipped',
      rowsWritten: 0,
      rowsRejected: 0,
      vintage: null,
      notes: connector.unavailableReason,
    });
  }

  const started = await SourceRepository.startRun(row.id, triggeredBy);
  if (started.isErr()) return err(started.error);
  const runId = started.value;

  let outcome: Result<ConnectorOutcome, RequestError>;
  try {
    outcome = await connector.fetch({ sourceId: row.id, sourceKey, runId, now });
  } catch (error) {
    // A connector must not throw, but a third-party client inside one might.
    logger.error('connector threw', { sourceKey, runId, error });
    outcome = err(isRequestError(error) ? error : ERRORS.UPSTREAM_UNAVAILABLE);
  }

  if (outcome.isErr()) {
    await SourceRepository.completeRun({
      runId,
      status: RunStatus.Failed,
      rowsWritten: 0,
      rowsRejected: 0,
      errorCode: outcome.error.code,
      notes: outcome.error.message,
      vintage: null,
    });
    logger.warn('ingestion run failed', { sourceKey, runId, code: outcome.error.code });
    return ok({
      sourceKey,
      runId,
      status: RunStatus.Failed,
      rowsWritten: 0,
      rowsRejected: 0,
      vintage: null,
      notes: outcome.error.message,
    });
  }

  const result = outcome.value;
  const status = result.rowsRejected > 0 ? RunStatus.PartialSuccess : RunStatus.Succeeded;

  const completed = await SourceRepository.completeRun({
    runId,
    status,
    rowsWritten: result.rowsWritten,
    rowsRejected: result.rowsRejected,
    errorCode: null,
    notes: result.notes ?? null,
    vintage: result.vintage,
  });
  if (completed.isErr()) return err(completed.error);

  logger.info('ingestion run complete', {
    sourceKey,
    runId,
    status,
    rowsWritten: result.rowsWritten,
  });

  return ok({
    sourceKey,
    runId,
    status,
    rowsWritten: result.rowsWritten,
    rowsRejected: result.rowsRejected,
    vintage: result.vintage,
    notes: result.notes ?? null,
  });
}
