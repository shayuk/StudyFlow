import pino from 'pino';
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse & { statusCode: number },
    err?: unknown,
  ) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
