import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, connectToDatabase } from './database/db.js';
import { startScheduler, type Scheduler } from './services/ingestion/scheduler.js';
import createLogger from './utils/logger.js';
import { describeError } from './utils/describe-error.js';

const logger = createLogger('@server');

async function main(): Promise<void> {
  // Connect before listening, so the server never accepts traffic it cannot serve.
  await connectToDatabase();

  const server: Server = createApp().listen(env.PORT, () => {
    logger.info('server started', { port: env.PORT, env: env.APP_ENV });
  });

  // The connectors it runs are registered by app.ts's import of the ingestion index.
  const scheduler: Scheduler | null = env.SCHEDULER_ENABLED ? startScheduler() : null;

  const shutdown = (signal: string): void => {
    logger.info('shutting down', { signal });
    server.close(() => {
      // Let a running ingestion finish before the pool it writes through is closed.
      void (scheduler?.stop() ?? Promise.resolve())
        .then(() => closeDatabase())
        .then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

main().catch((error: unknown) => {
  logger.error('startup failed', { error: describeError(error) });
  process.exit(1);
});
