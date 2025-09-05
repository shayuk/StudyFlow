import 'dotenv/config';
import express, { Request, Response } from 'express';
import { httpLogger, logger } from './logger';
import meRouter from './routes/me';
import coursesRouter from './routes/courses';
import botsRouter from './routes/bots';
import chatRouter from './routes/chat';
import progressRouter from './routes/progress';
import knowledgeRouter from './routes/knowledge';

const app = express();

app.use(express.json());
app.use(httpLogger);

// Boot-time config checks (non-fatal in dev, fatal in prod)
const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_AUTH_MODE = process.env.DEV_AUTH_MODE === 'true';
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

if (!hasOpenAI || !hasAnthropic) {
  const msg = 'LLM API keys missing: ' +
    `${!hasOpenAI ? 'OPENAI_API_KEY ' : ''}${!hasAnthropic ? 'ANTHROPIC_API_KEY' : ''}`.trim();
  if (IS_PROD) {
    logger.error({ msg }, 'Fatal: required LLM keys are not configured in production');
    // Exit to avoid running a broken service in production
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

// Protected routes
app.use('/api', meRouter);
app.use('/api', coursesRouter);
app.use('/api', botsRouter);
app.use('/api', chatRouter);
app.use('/api', progressRouter);
app.use('/api', knowledgeRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Backend server started');
});

// Export the app for integration testing (Supertest)
export { app };
