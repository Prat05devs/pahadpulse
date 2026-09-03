import winston from 'winston';

import { env } from '../config/env.js';

const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug');

const base = winston.createLogger({
  level,
  format:
    env.NODE_ENV === 'production'
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf((info) => {
            const { timestamp, level: lvl, message, scope, ...rest } = info;
            const at = typeof timestamp === 'string' ? timestamp : '';
            const label = typeof scope === 'string' ? scope : 'app';
            const text = typeof message === 'string' ? message : JSON.stringify(message);
            const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
            return `${at} ${lvl} [${label}] ${text}${extra}`;
          }),
        ),
  transports: [new winston.transports.Console({ silent: env.NODE_ENV === 'test' })],
});

/** `const logger = createLogger('@area.repository')` — scope is the module, not the file path. */
export default function createLogger(scope: string): winston.Logger {
  return base.child({ scope });
}
