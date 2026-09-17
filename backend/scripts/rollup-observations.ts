/**
 * Rolls raw observations up into daily aggregates, then prunes the raw rows.
 *
 * WHY THIS EXISTS. `observations` is the only table in this system that grows without
 * bound. Measured rate is 169 rows an hour — 78 weather and 91 air quality, one per station
 * per metric — which is 1.48 million rows a year, roughly 249 MB in Postgres. Against
 * Supabase's 500 MB free tier the database is comfortable for about eighteen months and
 * then is not, and by then it is an emergency under a hard ceiling rather than a decision.
 *
 * hydromet.md §9 has carried "retention and rollup for observations" as an open question
 * since the module was designed, with the note that this table outgrows everything else.
 * This is that decision: raw rows for 90 days, daily aggregates kept indefinitely. Steady
 * state is roughly 74 MB and flat.
 *
 * WHAT IS LOST, STATED PLAINLY. Hourly detail older than 90 days. What survives is the
 * daily minimum, maximum and mean per station and metric — which is what a year-over-year
 * comparison actually needs, and the only question anyone asks of a multi-year series.
 * Anyone who needs hourly history beyond 90 days needs a different retention policy, and
 * should change this file rather than discover the gap later.
 *
 * Run order matters: aggregate first, prune second, in that order, in one transaction. A
 * prune that ran first would delete rows that had not been summarised yet.
 */
import { db } from '../src/database/db.js';
import createLogger from '../src/utils/logger.js';

const logger = createLogger('@rollup');

/** Raw rows older than this are summarised and deleted. */
const RAW_RETENTION_DAYS = 90;

/**
 * Uttarakhand is IST year round, with no daylight saving.
 *
 * The aggregate is grouped by LOCAL day, not UTC day. A "day" in a daily summary means the
 * day as the reader lives it — grouping by UTC would split every Indian day at 05:30 and
 * produce a "daily maximum" that is the maximum of two half-days.
 */
const IST = 'Asia/Kolkata';

async function run(): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    /*
     * The cutoff is LOCAL MIDNIGHT, never "exactly 90 days ago".
     *
     * A timestamp cutoff lands mid-day — at 08:10 IST when this cron runs — and splits the
     * boundary day in two. The first night summarised that day's morning and deleted it; the
     * next night the upsert below rebuilt the same day from only the afternoon that was left,
     * silently overwriting the morning's min, max, mean and sample count. Every rolled-up day
     * lost part of itself, in the table that is kept forever.
     *
     * Truncating to an IST day boundary means a day is summarised only once all of it is
     * past the window, and computing the value once means the summary and the prune can
     * never disagree about which rows they cover. `observed_at` is naive UTC, so the local
     * midnight is converted back to naive UTC before comparing.
     */
    const cutoffResult = await client.query<{ cutoff: string }>(
      `SELECT ((date_trunc('day', now() AT TIME ZONE $2) - ($1 * INTERVAL '1 day'))
                 AT TIME ZONE $2) AT TIME ZONE 'utc' AS cutoff`,
      [RAW_RETENTION_DAYS, IST],
    );
    const cutoff = cutoffResult.rows[0]?.cutoff;
    if (cutoff === undefined) throw new Error('rollup cutoff query returned no row');

    /*
     * Summarise every IST day that is fully past the retention window.
     *
     * Re-runnable: the upsert recomputes a day from whatever raw rows remain, so a job that
     * failed halfway or ran twice converges on the same answer rather than double-counting.
     * `sample_count` carries how many readings a day was built from, so a partial day is
     * visible as partial rather than passing for a complete one.
     */
    const rolled = await client.query(
      `INSERT INTO observations_daily
         (station_id, metric, day, value_min, value_max, value_avg, sample_count, unit, source_id)
       SELECT o.station_id,
              o.metric,
              (o.observed_at AT TIME ZONE 'utc' AT TIME ZONE $2)::date AS day,
              MIN(o.value),
              MAX(o.value),
              AVG(o.value),
              COUNT(*),
              -- One unit per station and metric in practice; MIN picks deterministically
              -- if a source ever changes units mid-day rather than failing the aggregate.
              MIN(o.unit),
              MIN(o.source_id)
         FROM observations o
        WHERE o.observed_at < $1
        GROUP BY o.station_id, o.metric,
                 (o.observed_at AT TIME ZONE 'utc' AT TIME ZONE $2)::date
       ON CONFLICT (station_id, metric, day) DO UPDATE SET
         value_min    = EXCLUDED.value_min,
         value_max    = EXCLUDED.value_max,
         value_avg    = EXCLUDED.value_avg,
         sample_count = EXCLUDED.sample_count,
         unit         = EXCLUDED.unit,
         source_id    = EXCLUDED.source_id`,
      [cutoff, IST],
    );

    // Only rows that are now represented in the aggregate above.
    const pruned = await client.query(
      `DELETE FROM observations
        WHERE observed_at < $1`,
      [cutoff],
    );

    await client.query('COMMIT');

    logger.info('rollup complete', {
      retentionDays: RAW_RETENTION_DAYS,
      cutoffUtc: cutoff,
      daysWritten: rolled.rowCount ?? 0,
      rawRowsPruned: pruned.rowCount ?? 0,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('rollup failed', { error });
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

await run();
