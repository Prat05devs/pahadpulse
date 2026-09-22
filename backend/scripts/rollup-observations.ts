/**
 * Rolls raw observations up into daily aggregates, then prunes the raw rows.
 *
 * The API's in-process scheduler runs this nightly; this CLI is for running it by hand.
 * The reasoning and the retention window live in `observation-rollup.service.ts`.
 */
import { db } from '../src/database/db.js';
import { rollupObservations } from '../src/services/observation-rollup.service.js';

const result = await rollupObservations();
if (result.isErr()) process.exitCode = 1;
await db.end();
