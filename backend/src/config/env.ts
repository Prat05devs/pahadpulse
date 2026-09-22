import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  SERVER_URL: z.url().default('http://localhost:3000'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  /*
   * Supabase's free tier allows 60 direct connections across everything that connects.
   * The API plus five ingestion crons must fit inside that together, so the default is
   * deliberately modest — a pool sized for a dedicated server will exhaust a shared one.
   */
  DB_POOL_LIMIT: z.coerce.number().int().positive().default(10),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DB_SSL_CA: z
    .string()
    .default('')
    .transform((value) => value.replace(/\\n/g, '\n')),

  /**
   * Who to record in `ingestion_runs.triggered_by`. The scheduler sets it; a run from a
   * shell keeps the default. Bounded to the column width (VARCHAR(64), migration 003).
   */
  INGEST_TRIGGERED_BY: z.string().min(1).max(64).default('cli'),

  /**
   * Run ingestion on a timer inside the API process (services/ingestion/scheduler.ts).
   * Off by default so local dev, tests and one-off CLI runs never start it; production
   * turns it on in render.yaml. Exactly one API instance may have it on — see the scheduler.
   */
  SCHEDULER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  /**
   * SACHET drops connections from Render's Singapore region, so alert ingestion can fetch
   * it through the web app's relay on Vercel Mumbai (web/src/app/api/relay/sachet). Both
   * set: every SACHET request goes through the relay. Both unset: SACHET is fetched
   * directly, which is what works from a machine in India.
   */
  SACHET_RELAY_URL: z.url().optional(),
  SACHET_RELAY_KEY: z.string().min(32).optional(),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

const parsed = EnvSchema.refine(
  (value) => (value.SACHET_RELAY_URL === undefined) === (value.SACHET_RELAY_KEY === undefined),
  { message: 'set both or neither', path: ['SACHET_RELAY_URL'] },
).safeParse(process.env);

if (!parsed.success) {
  // The only permitted console usage in the codebase. Key names only — never values.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
