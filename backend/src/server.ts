import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, connectToDatabase } from './database/db.js';
import createLogger from './utils/logger.js';
import { describeError } from './utils/describe-error.js';

const logger = createLogger('@server');

async function main(): Promise<void> {
  // Connect before listening, so the server never accepts traffic it cannot serve.
  await connectToDatabase();

  const server: Server = createApp().listen(env.PORT, () => {
    logger.info('server started', { port: env.PORT, env: env.APP_ENV });
  });

  const shutdown = (signal: string): void => {
    logger.info('shutting down', { signal });
    server.close(() => {
      void closeDatabase().then(() => process.exit(0));
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
