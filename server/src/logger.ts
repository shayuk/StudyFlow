import pino from 'pino';
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

// Ensure logs directory exists at repo root: logs/app.log
const LOG_DIR = path.resolve(__dirname, '../../logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Write to both stdout and file using multistream
const fileStream = pino.destination({ dest: LOG_FILE, sync: false });
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' }, pino.multistream([
  { stream: process.stdout },
  { stream: fileStream },
]));

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
