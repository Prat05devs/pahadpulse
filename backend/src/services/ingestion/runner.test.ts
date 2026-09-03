import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { SourceRow } from '../../models/source.model.js';
import type { ISourceRepository } from '../../repositories/source.repository.js';
import { AccessMethod, Cadence, MetadataStatus, RunStatus } from '../../types/dataset.js';
import { ERRORS } from '../../utils/errors.js';
import { clearConnectors, registerConnector, type SourceConnector } from './connector.js';

const mockRepo: jest.Mocked<ISourceRepository> = {
  listAll: jest.fn(),
  findByKey: jest.fn(),
  findRowByKey: jest.fn(),
  findByIds: jest.fn(),
  startRun: jest.fn(),
  completeRun: jest.fn(),
  listRuns: jest.fn(),
  expireStuckRuns: jest.fn(),
};

jest.unstable_mockModule('../../repositories/source.repository.js', () => ({
  SourceRepository: mockRepo,
}));

const { runSource } = await import('./runner.js');

const sourceRow = {
  id: 1,
  source_key: 'demo-source',
  owner_module: 'indicators',
  department_en: 'Demo Department',
  department_hi: 'डेमो विभाग',
  url: 'https://example.gov.in',
  attribution: 'Source: Demo',
  licence: 'Demo licence',
  access_method: AccessMethod.Api,
  cadence: Cadence.Daily,
  may_redistribute: 1,
  metadata_status: MetadataStatus.Provisional,
  metadata_note: null,
  is_enabled: 1,
  updated_at: '2026-09-03 00:00:00',
} as SourceRow;

function connector(overrides: Partial<SourceConnector> = {}): SourceConnector {
  return {
    sourceKey: 'demo-source',
    ownerModule: 'indicators',
    isAvailable: true,
    unavailableReason: null,
    fetch: () => Promise.resolve(ok({ rowsWritten: 5, rowsRejected: 0, vintage: '2011-03-01' })),
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockRepo)) fn.mockReset();
  clearConnectors();
  mockRepo.findRowByKey.mockResolvedValue(ok(sourceRow));
  mockRepo.startRun.mockResolvedValue(ok(42));
  mockRepo.completeRun.mockResolvedValue(ok(undefined));
});

describe('runSource', () => {
  it('records a successful run with the vintage the connector reported', async () => {
    registerConnector(connector());

    const result = await runSource('demo-source', 'cli');

    expect(result._unsafeUnwrap().status).toBe(RunStatus.Succeeded);
    expect(mockRepo.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 42,
        status: RunStatus.Succeeded,
        rowsWritten: 5,
        // DS-2: the date the data describes, not the date we fetched it.
        vintage: '2011-03-01',
        errorCode: null,
      }),
    );
  });

  it('records partial_success when the connector rejected some rows', async () => {
    registerConnector(
      connector({
        fetch: () => Promise.resolve(ok({ rowsWritten: 8, rowsRejected: 2, vintage: null })),
      }),
    );

    const result = await runSource('demo-source');
    expect(result._unsafeUnwrap().status).toBe(RunStatus.PartialSuccess);
  });

  /** DS-4 — a failed run records the failure; it never deletes or invalidates data. */
  it('records a failed run with the upstream error code', async () => {
    registerConnector(
      connector({ fetch: () => Promise.resolve(err(ERRORS.UPSTREAM_RESPONSE_INVALID)) }),
    );

    const result = await runSource('demo-source');

    expect(result._unsafeUnwrap().status).toBe(RunStatus.Failed);
    expect(mockRepo.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RunStatus.Failed,
        errorCode: ERRORS.UPSTREAM_RESPONSE_INVALID.code,
        rowsWritten: 0,
      }),
    );
  });

  it('converts a connector that throws into a recorded failure', async () => {
    registerConnector(
      connector({
        fetch: () => {
          throw new Error('socket hang up');
        },
      }),
    );

    const result = await runSource('demo-source');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().status).toBe(RunStatus.Failed);
    expect(mockRepo.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: ERRORS.UPSTREAM_UNAVAILABLE.code }),
    );
  });

  /** An unavailable connector is not a failure — it would bury real failures in noise. */
  it('skips an unavailable connector without opening a run', async () => {
    registerConnector(connector({ isAvailable: false, unavailableReason: 'No API key yet.' }));

    const result = await runSource('demo-source');

    expect(result._unsafeUnwrap().status).toBe('skipped');
    expect(result._unsafeUnwrap().notes).toBe('No API key yet.');
    expect(mockRepo.startRun).not.toHaveBeenCalled();
    expect(mockRepo.completeRun).not.toHaveBeenCalled();
  });

  it('skips a source disabled in the registry', async () => {
    mockRepo.findRowByKey.mockResolvedValue(ok({ ...sourceRow, is_enabled: 0 }));
    registerConnector(connector());

    const result = await runSource('demo-source');

    expect(result._unsafeUnwrap().status).toBe('skipped');
    expect(mockRepo.startRun).not.toHaveBeenCalled();
  });

  it('fails when no connector is registered for the source', async () => {
    const result = await runSource('demo-source');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.CONNECTOR_NOT_AVAILABLE.code);
  });

  it('propagates SOURCE_NOT_FOUND without re-wrapping', async () => {
    mockRepo.findRowByKey.mockResolvedValue(err(ERRORS.SOURCE_NOT_FOUND));
    const result = await runSource('nope');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.SOURCE_NOT_FOUND.code);
  });

  /** DS-5 — concurrency is refused at the repository, and the runner surfaces it. */
  it('propagates INGESTION_RUN_IN_PROGRESS', async () => {
    registerConnector(connector());
    mockRepo.startRun.mockResolvedValue(err(ERRORS.INGESTION_RUN_IN_PROGRESS));

    const result = await runSource('demo-source');
    expect(result._unsafeUnwrapErr().code).toBe(ERRORS.INGESTION_RUN_IN_PROGRESS.code);
  });
});
