import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { err, ok } from 'neverthrow';

import type { Source } from '../../models/source.model.js';
import type { ISourceRepository } from '../../repositories/source.repository.js';
import { RunStatus } from '../../types/dataset.js';
import { ERRORS } from '../../utils/errors.js';
import type { RunReport } from './runner.js';

const mockRepo = {
  listAll: jest.fn<ISourceRepository['listAll']>(),
  pruneRuns: jest.fn<ISourceRepository['pruneRuns']>(),
};
const mockRunSource = jest.fn<(key: string, triggeredBy?: string) => Promise<unknown>>();
const mockRollup = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule('../../repositories/source.repository.js', () => ({
  SourceRepository: mockRepo,
}));
jest.unstable_mockModule('./runner.js', () => ({ runSource: mockRunSource }));
jest.unstable_mockModule('../observation-rollup.service.js', () => ({
  rollupObservations: mockRollup,
}));

const { dueJobs, runDueJobs, seedLastRuns } = await import('./scheduler.js');
type ScheduledJob = import('./scheduler.js').ScheduledJob;

const MINUTE = 60 * 1000;
const NOW = new Date('2026-09-22T03:00:00.000Z');

const alerts: ScheduledJob = {
  name: 'sachet-ndma',
  intervalMs: 15 * MINUTE,
  sourceKey: 'sachet-ndma',
};
const weather: ScheduledJob = {
  name: 'open-meteo',
  intervalMs: 60 * MINUTE,
  sourceKey: 'open-meteo',
};
const rollup: ScheduledJob = {
  name: 'observation-rollup',
  intervalMs: 24 * 60 * MINUTE,
  sourceKey: null,
};

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * MINUTE);
}

function report(status: RunReport['status']): RunReport {
  return {
    sourceKey: 'sachet-ndma',
    runId: 1,
    status,
    rowsWritten: 0,
    rowsRejected: 0,
    vintage: null,
    notes: null,
  };
}

beforeEach(() => {
  mockRepo.listAll.mockReset();
  mockRunSource.mockReset();
  mockRollup.mockReset();
  mockRepo.pruneRuns.mockReset();
  mockRepo.pruneRuns.mockResolvedValue(ok(0));
  mockRunSource.mockResolvedValue(ok(report(RunStatus.Succeeded)));
  mockRollup.mockResolvedValue(ok({ cutoffUtc: '', daysWritten: 0, rawRowsPruned: 0 }));
});

describe('dueJobs', () => {
  it('treats a job that has never run as due', () => {
    expect(dueJobs([alerts], new Map(), NOW)).toEqual([alerts]);
  });

  it('holds a job until its interval has passed', () => {
    const lastRuns = new Map([['sachet-ndma', minutesAgo(10)]]);
    expect(dueJobs([alerts], lastRuns, NOW)).toEqual([]);
  });

  it('allows one tick of slack so a job does not drift a tick later every cycle', () => {
    const lastRuns = new Map([['sachet-ndma', minutesAgo(14)]]);
    expect(dueJobs([alerts], lastRuns, NOW)).toEqual([alerts]);
  });

  it('keeps the declared priority order when several jobs are due at once', () => {
    expect(dueJobs([alerts, weather, rollup], new Map(), NOW).map((job) => job.name)).toEqual([
      'sachet-ndma',
      'open-meteo',
      'observation-rollup',
    ]);
  });
});

describe('seedLastRuns', () => {
  it('seeds each source job from the run log so a restart catches up rather than re-runs', async () => {
    mockRepo.listAll.mockResolvedValue(
      ok([
        { key: 'sachet-ndma', lastRunAt: '2026-09-22 02:50:00' },
        { key: 'open-meteo', lastRunAt: null },
      ] as Source[]),
    );

    const lastRuns = await seedLastRuns([alerts, weather, rollup]);

    expect(lastRuns.get('sachet-ndma')).toEqual(new Date('2026-09-22T02:50:00.000Z'));
    expect(lastRuns.has('open-meteo')).toBe(false);
    // The rollup keeps no run log, so it runs once on boot.
    expect(lastRuns.has('observation-rollup')).toBe(false);
  });

  it('treats every job as due when the run log cannot be read', async () => {
    mockRepo.listAll.mockResolvedValue(err(ERRORS.DATABASE_ERROR));

    const lastRuns = await seedLastRuns([alerts, weather]);

    expect(lastRuns.size).toBe(0);
  });
});

describe('runDueJobs', () => {
  it('runs due source jobs through the runner as the scheduler, and the rollup directly', async () => {
    const lastRuns = new Map([['open-meteo', minutesAgo(5)]]);

    await runDueJobs([alerts, weather, rollup], lastRuns, () => NOW);

    expect(mockRunSource).toHaveBeenCalledTimes(1);
    expect(mockRunSource).toHaveBeenCalledWith('sachet-ndma', 'scheduler');
    expect(mockRollup).toHaveBeenCalledTimes(1);
    // The nightly slot also trims the run log to its 90-day retention.
    expect(mockRepo.pruneRuns).toHaveBeenCalledWith(90);
    expect(lastRuns.get('sachet-ndma')).toEqual(NOW);
    expect(lastRuns.get('open-meteo')).toEqual(minutesAgo(5));
  });

  it('marks a failed job as run so it waits a full interval before retrying', async () => {
    mockRunSource.mockResolvedValue(ok(report(RunStatus.Failed)));
    const lastRuns = new Map<string, Date>();

    await runDueJobs([alerts], lastRuns, () => NOW);

    expect(lastRuns.get('sachet-ndma')).toEqual(NOW);
    expect(dueJobs([alerts], lastRuns, NOW)).toEqual([]);
  });

  it('carries on to the next job when one throws', async () => {
    mockRunSource.mockRejectedValueOnce(new Error('connector blew up'));

    await runDueJobs([alerts, rollup], new Map(), () => NOW);

    expect(mockRollup).toHaveBeenCalledTimes(1);
  });

  it('stops between jobs once a shutdown asks it to', async () => {
    let calls = 0;

    await runDueJobs(
      [alerts, weather],
      new Map(),
      () => NOW,
      () => calls++ === 0,
    );

    expect(mockRunSource).toHaveBeenCalledTimes(1);
  });
});
