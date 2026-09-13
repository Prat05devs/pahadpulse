import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';

import { BODY_LIMIT } from './config/constants.js';
import { env } from './config/env.js';
import { db } from './database/db.js';
import { errorHandler } from './middleware/error.middleware.js';
import { httpLogger } from './middleware/http-logger.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { limiter } from './middleware/ratelimit.middleware.js';
import { requestId } from './middleware/request-id.middleware.js';
import apiRouter from './routes/index.js';
// Side effect: populates the connector registry exactly once.
import './services/ingestion/index.js';

export function createApp(): Application {
  const app = express();
  app.set('trust proxy', 1);

  // Keep the public web clients reachable even when a hosting environment still has the
  // development-only CORS value. Both domains are real entry points: the apex redirects to
  // www, but browser requests may begin before or after that redirect has settled.
  const allowedOrigins = [
    ...env.CORS_ORIGIN,
    'https://pahadpulse.live',
    'https://www.pahadpulse.live',
  ];

  app.use(requestId);
  app.use(helmet());
  app.use(limiter);
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
  app.use(cookieParser());
  app.use(httpLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', env: env.APP_ENV, timestamp: new Date().toISOString() });
  });

  app.get('/ready', (_req: Request, res: Response) => {
    void db
      .query('SELECT 1')
      .then(() => res.json({ status: 'ready' }))
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler); // always last
  return app;
}
