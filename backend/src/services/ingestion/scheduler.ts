import { INGESTION_RUN_RETENTION_DAYS, INGESTION_SCHEDULE, PUSH } from '../../config/constants.js';
import { SourceRepository } from '../../repositories/source.repository.js';
import { RunStatus } from '../../types/dataset.js';
import { describeError } from '../../utils/describe-error.js';
import createLogger from '../../utils/logger.js';
import { dispatchNewAlerts } from '../notification.service.js';
import { rollupObservations } from '../observation-rollup.service.js';
import { runSource } from './runner.js';

const logger = createLogger('@ingestion.scheduler');

/**
 * The in-process ingestion scheduler.
 *
 * WHY IN-PROCESS. Render cron jobs are billed per service with a monthly minimum, and the
 * GitHub Actions workflow that replaced them stopped the day the account was locked for
 * billing — every scheduled run failed before it started, and the data froze without
 * anyone noticing. The API is already a long-running process with a database pool, so it
 * runs the same connectors itself. On Render's free plan it stays awake because an external
 * pinger (cron-job.org) requests `/health` every 10 minutes; see project/operations.md.
 *
 * SINGLE INSTANCE. Every API instance with `SCHEDULER_ENABLED=true` runs every job. The
 * source-row lock in `startRun` stops two instances ingesting the same source at once, but
 * they would still duplicate work. Scale out only with the flag on exactly one instance.
 *
 * NOT HERE: the weekly reference refresh (`openstreetmap`, `openstreetmap-roads`). The
 * boundary and village pass holds the whole state's geometry in memory for over a minute,
 * which on a 512 MB instance risks taking the API down with it. It runs by hand.
 */

export interface ScheduledJob {
  /** Log name. For source jobs, the registry key the job ingests. */
  name: string;
  intervalMs: number;
  /** The registry source this job ingests, or null for maintenance jobs. */
  sourceKey: string | null;
}

/**
 * Order is priority: when several jobs are due at once (on boot, after a sleep), they run
 * one at a time in this order, so a flood warning never queues behind a weather refresh.
 */
export const SCHEDULED_JOBS: readonly ScheduledJob[] = [
  // SACHET publishes 3-hour nowcasts; a slower cadence routinely shows expired warnings.
  { name: 'sachet-ndma', intervalMs: INGESTION_SCHEDULE.ALERTS_MS, sourceKey: 'sachet-ndma' },
  // GDACS scores events over days; half-hourly keeps the scores current.
  { name: 'gdacs', intervalMs: INGESTION_SCHEDULE.GDACS_MS, sourceKey: 'gdacs' },
  // USGS revises magnitude for hours after an event.
  {
    name: 'usgs-earthquakes',
    intervalMs: INGESTION_SCHEDULE.SEISMIC_MS,
    sourceKey: 'usgs-earthquakes',
  },
  // Road closures change within the hour, and a reopened road shown as closed is its own
  // misinformation. Skipped by the runner while the source is disabled (migration 064).
  {
    name: 'pwd-uk-road-closures',
    intervalMs: INGESTION_SCHEDULE.ROAD_CLOSURES_MS,
    sourceKey: 'pwd-uk-road-closures',
  },
  // Open-Meteo refreshes its model hourly; faster polling re-reads unchanged numbers.
  { name: 'open-meteo', intervalMs: INGESTION_SCHEDULE.WEATHER_MS, sourceKey: 'open-meteo' },
  {
    name: 'open-meteo-air-quality',
    intervalMs: INGESTION_SCHEDULE.AIR_QUALITY_MS,
    sourceKey: 'open-meteo-air-quality',
  },
  // Keeps `observations` and the run log under the database's free-tier ceiling.
  { name: 'observation-rollup', intervalMs: INGESTION_SCHEDULE.ROLLUP_MS, sourceKey: null },
  // Tells the devices that asked about warnings the alert jobs above just stored.
  { name: 'alert-notifications', intervalMs: PUSH.DISPATCH_MS, sourceKey: null },
];

/** `last_run_at` is a naive UTC string from the driver, as elsewhere in the repository. */
function parseUtc(value: string | null): Date | null {
  if (value === null) return null;
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * When each job last ran, seeded from the run log so a restart does not re-ingest
 * everything and a long sleep catches up. Any trigger counts — a run from the CLI resets
 * the clock just as a scheduled one does. The rollup keeps no run log, so it is unseeded
 * and runs once on boot; it is idempotent.
 */
export async function seedLastRuns(jobs: readonly ScheduledJob[]): Promise<Map<string, Date>> {
  const lastRuns = new Map<string, Date>();
  const sources = await SourceRepository.listAll();
  if (sources.isErr()) {
    // Not fatal: with nothing seeded every job is due, which is the safe direction.
    logger.warn('could not read the run log; treating every job as due', {
      code: sources.error.code,
    });
    return lastRuns;
  }
  for (const job of jobs) {
    const source = sources.value.find((s) => s.key === job.sourceKey);
    const lastRunAt = parseUtc(source?.lastRunAt ?? null);
    if (lastRunAt !== null) lastRuns.set(job.name, lastRunAt);
  }
  return lastRuns;
}

/**
 * A job is due once its interval has passed since it last ran, less one tick of slack so
 * a job does not slide a whole tick later every cycle.
 */
export function dueJobs(
  jobs: readonly ScheduledJob[],
  lastRuns: ReadonlyMap<string, Date>,
  now: Date,
): ScheduledJob[] {
  return jobs.filter((job) => {
    const lastRun = lastRuns.get(job.name);
    if (lastRun === undefined) return true;
    return now.getTime() - lastRun.getTime() >= job.intervalMs - INGESTION_SCHEDULE.TICK_MS;
  });
}

async function runJob(job: ScheduledJob): Promise<void> {
  if (job.name === 'alert-notifications') {
    await dispatchNewAlerts();
    return;
  }
  if (job.sourceKey === null) {
    await rollupObservations();
    // Same nightly slot: the run log is the other table that would otherwise grow forever.
    const pruned = await SourceRepository.pruneRuns(INGESTION_RUN_RETENTION_DAYS);
    if (pruned.isOk() && pruned.value > 0) {
      logger.info('pruned old ingestion runs', { deleted: pruned.value });
    }
    return;
  }
  const report = await runSource(job.sourceKey, 'scheduler');
  if (report.isErr()) {
    logger.error('scheduled run could not start', { job: job.name, code: report.error.code });
    return;
  }
  if (report.value.status === RunStatus.Failed) {
    // The runner has already recorded the failure; the next interval retries it.
    logger.warn('scheduled run failed', { job: job.name, notes: report.value.notes });
  }
}

/**
 * Runs every due job, one at a time, recording each as run when it STARTS — a job that
 * fails waits a full interval before retrying rather than hammering a broken upstream
 * every tick. `shouldContinue` lets a shutdown stop the queue between jobs.
 */
export async function runDueJobs(
  jobs: readonly ScheduledJob[],
  lastRuns: Map<string, Date>,
  now: () => Date = () => new Date(),
  shouldContinue: () => boolean = () => true,
): Promise<void> {
  for (const job of dueJobs(jobs, lastRuns, now())) {
    if (!shouldContinue()) return;
    lastRuns.set(job.name, now());
    try {
      await runJob(job);
    } catch (error) {
      // Connectors and the runner return errors as values, but this loop outlives any one
      // job: a throw that escaped here would be an unhandled rejection in the API process.
      logger.error('scheduled job threw', { job: job.name, error: describeError(error) });
    }
  }
}

export interface Scheduler {
  /** Stops scheduling and resolves once the job in flight, if any, has finished. */
  stop(): Promise<void>;
}

export function startScheduler(jobs: readonly ScheduledJob[] = SCHEDULED_JOBS): Scheduler {
  let stopped = false;
  let inFlight: Promise<void> = Promise.resolve();
  let busy = false;
  let lastRuns: Map<string, Date> | null = null;

  const tick = (): void => {
    // A tick that lands while the previous one is still working is skipped, not queued:
    // the next tick re-evaluates what is due anyway.
    if (busy || stopped) return;
    busy = true;
    inFlight = (async () => {
      lastRuns ??= await seedLastRuns(jobs);
      await runDueJobs(jobs, lastRuns, undefined, () => !stopped);
    })()
      .catch((error: unknown) => {
        logger.error('scheduler tick failed', { error: describeError(error) });
      })
      .finally(() => {
        busy = false;
      });
  };

  const timer = setInterval(tick, INGESTION_SCHEDULE.TICK_MS);
  // Never hold the process open on the timer alone; the HTTP server does that.
  timer.unref();
  logger.info('scheduler started', { jobs: jobs.map((job) => job.name) });
  tick();

  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await inFlight;
      logger.info('scheduler stopped');
    },
  };
}
