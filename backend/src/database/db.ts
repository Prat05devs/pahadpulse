import mysql from 'mysql2/promise';

import { env } from '../config/env.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@database');

export const db = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_POOL_LIMIT,
  ...(env.DB_SSL
    ? {
        ssl: {
          rejectUnauthorized: true,
          verifyIdentity: true,
          ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}),
        },
      }
    : {}),
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  timezone: 'Z', // mandatory — store and read UTC
  dateStrings: true, // driver returns strings; the app converts deliberately
  namedPlaceholders: false,
  multipleStatements: false, // mandatory — never enable
});

export async function connectToDatabase(): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.ping();
    logger.info('database connected', { database: env.DB_NAME, env: env.APP_ENV });
  } finally {
    connection.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await db.end();
}
