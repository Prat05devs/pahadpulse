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

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

const parsed = EnvSchema.safeParse(process.env);

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
