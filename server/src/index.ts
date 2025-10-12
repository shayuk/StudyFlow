import 'dotenv/config';
console.log(">>> NODE_ENV =", process.env.NODE_ENV);
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
import usersRouter from './routes/users';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(httpLogger);
app.use(rateLimitLocal);

const allowedOrigins = [
  'https://studyflow-b6265.web.app'
];

const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin) return callback(null, true);
  const ok =
    allowedOrigins.includes(origin) ||
    /\.web\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin);
  callback(ok ? null : new Error('Not allowed by CORS'), ok);
};

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve API docs (Swagger UI) from docs/api at /docs
app.use('/docs', express.static(path.resolve(__dirname, '../../docs/api')));
// Serve standalone Admin UI at /admin
app.use('/admin', express.static(path.resolve(__dirname, '../../docs/admin')));

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
app.use('/api', plannerRouter);
app.use('/api', analyticsRouter);
app.use('/api', usersRouter);

// Centralized error handler must be last
app.use(errorHandler);

// Export the app for integration testing (Supertest)
export { app };
