import 'dotenv/config';
console.log('>>> NODE_ENV =', process.env.NODE_ENV);

import express, { Request, Response } from 'express';
import path from 'node:path';
import { httpLogger, logger } from './logger';
import { rateLimitLocal } from './middleware/rateLimit';
import meRouter from './routes/me';
import coursesRouter from './routes/courses';
import botsRouter from './routes/bots';
import chatRouter from './routes/chat';
import progressRouter from './routes/progress';
import knowledgeRouter from './routes/knowledge';
import plannerRouter from './routes/planner';
import analyticsRouter from './routes/analytics';
import { errorHandler } from './middleware/error';
import { ensureDefaultAdmin } from './bootstrap/ensureDefaultAdmin';
import studentRouter from './routes/student';

const app = express();

app.use(express.json());
app.use(httpLogger);
app.use(rateLimitLocal);

app.use('/docs', express.static(path.resolve(__dirname, '../../docs/api')));

const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_AUTH_MODE = process.env.DEV_AUTH_MODE === 'true';
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!hasOpenAI || !hasAnthropic) {
  const missing = `${!hasOpenAI ? 'OPENAI_API_KEY ' : ''}${!hasAnthropic ? 'ANTHROPIC_API_KEY' : ''}`.trim();
  const msg = `LLM API keys missing: ${missing}`;
  if (IS_PROD) {
    logger.error({ msg }, 'Fatal: required LLM keys are not configured in production');
    process.exit(1);
  } else {
    logger.warn({ msg }, 'Dev warning: running without full LLM keys. Chat LLM will be disabled/fallback');
  }
}

if (DEV_AUTH_MODE) {
  logger.warn('DEV_AUTH_MODE is enabled: JWT enforcement may be relaxed for development');
}

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
});

app.use('/api', meRouter);
app.use('/api', coursesRouter);
app.use('/api', botsRouter);
app.use('/api', chatRouter);
app.use('/api', progressRouter);
app.use('/api', knowledgeRouter);
app.use('/api', plannerRouter);
app.use('/api', analyticsRouter);
app.use('/api', studentRouter);

app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    logger.info({ port: PORT, docs: `http://localhost:${PORT}/docs` }, 'Backend server started');
    ensureDefaultAdmin().catch((err) => {
      logger.error({ err }, 'ensureDefaultAdmin failed');
    });
  });
} else {
  logger.info('Running on Vercel serverless runtime: skipping app.listen()');
}

export { app };
