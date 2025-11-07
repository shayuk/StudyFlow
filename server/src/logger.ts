import pino from 'pino';
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

// Check if running on Vercel
const IS_VERCEL = process.env.VERCEL === '1';

// Only create file logging if not on Vercel (serverless doesn't support file system)
let logger: pino.Logger;

if (IS_VERCEL) {
  // On Vercel, only log to stdout
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
} else {
  // Local/non-Vercel: log to both stdout and file
  const LOG_DIR = path.resolve(__dirname, '../../logs');
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }
  const LOG_FILE = path.join(LOG_DIR, 'app.log');
  
  const fileStream = pino.destination({ dest: LOG_FILE, sync: false });
  logger = pino({ level: process.env.LOG_LEVEL || 'info' }, pino.multistream([
    { stream: process.stdout },
    { stream: fileStream },
  ]));
}

export { logger };

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
