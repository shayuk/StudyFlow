// server/src/index.ts
import 'dotenv/config';
console.log(">>> NODE_ENV =", process.env.NODE_ENV);

import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';

import { httpLogger, logger } from './logger';
import { rateLimitLocal, rateLimitProdGlobal, rateLimitProdAuth } from './middleware/rateLimit';
import { errorHandler } from './middleware/error';

import meRouter from './routes/me';
import coursesRouter from './routes/courses';
import botsRouter from './routes/bots';
import chatRouter from './routes/chat';
import progressRouter from './routes/progress';
import knowledgeRouter from './routes/knowledge';
import plannerRouter from './routes/planner';
import analyticsRouter from './routes/analytics';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import calendarRouter from './routes/calendar';
import requireLLM from './middleware/requireLLM';

const app = express();

// אבטחה קטנה: הסתרת כותרת X-Powered-By
app.disable('x-powered-by');

/** ===== CORS (לפני כל מידלוור אחר) ===== */
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const allowedOrigins = [
    'https://studyflow-b6265.web.app',
    'https://studyflow-ui.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  
  const origin = req.headers.origin;
  
  // Allow all Vercel preview deployments
  const isVercelPreview = origin && (
    origin.includes('.vercel.app') || 
    origin.includes('vercel.app')
  );
  
  if (origin && (allowedOrigins.includes(origin) || isVercelPreview)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

/** ===== JSON / לוגים / רייט-לימיט גלובלי ===== */
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);
app.use(rateLimitLocal);

const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_AUTH_MODE = process.env.DEV_AUTH_MODE === 'true';
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const IS_VERCEL = process.env.VERCEL === '1';

if (IS_PROD) {
  app.use(rateLimitProdGlobal);
}

/** ===== בדיקות קונפיג בזמן עלייה (לא פאטליים ב־Vercel) ===== */
if (!hasOpenAI || !hasAnthropic) {
  const msg = 'LLM API keys missing: ' +
    `${!hasOpenAI ? 'OPENAI_API_KEY ' : ''}${!hasAnthropic ? 'ANTHROPIC_API_KEY' : ''}`.trim();

  if (IS_PROD && !IS_VERCEL) {
    logger.error({ msg }, 'Fatal: required LLM keys are not configured in production');
    process.exit(1);
  }
  logger.warn({ msg }, 'Running without full LLM keys. Chat LLM will be disabled/fallback');
}

if (DEV_AUTH_MODE) {
  logger.warn('DEV_AUTH_MODE is enabled: JWT enforcement may be relaxed for development');
}

/** ===== סטטיים (Docs/Admin) ===== */
app.use('/docs', express.static(path.resolve(__dirname, '../../docs/api')));
app.use('/admin', express.static(path.resolve(__dirname, '../../docs/admin')));

/** ===== Health & Ping ===== */
app.get('/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
});

// Ping מינימלי (לבדוק ראוטינג ללא DB)
app.get('/api/ping', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ ok: true, ts: Date.now() });
});
// Alias ללא קידומת /api לטובת מיפוי Vercel אפשרי
app.get('/ping', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ ok: true, ts: Date.now() });
});

// דיאגנוסטיקה להרשמה: מסלול קליל שאינו נוגע ב־DB
app.post('/api/auth/register_ping', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ ok: true, ts: Date.now() });
});
// Alias ללא קידומת /api
app.post('/auth/register_ping', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.status(200).json({ ok: true, ts: Date.now() });
});

/** ===== ראוטים ציבוריים /auth ===== */
// ⚠️ בזמן דיבוג תקיעות ב־register – השהיית rate-limit על auth כדי לבודד גורם:
// if (IS_PROD) {
//   app.use('/api/auth', rateLimitProdAuth);
// }
app.use('/api/auth', authRouter);

/** ===== ראוטי בריאות נוספים (אם יש) ===== */
app.use('/api', healthRouter);

/** ===== אכיפת LLM על /api/chat ===== */
app.use('/api/chat', requireLLM);

/** ===== ראוטים מוגנים ===== */
app.use('/api', meRouter);
app.use('/api', coursesRouter);
app.use('/api', botsRouter);
app.use('/api', chatRouter);
app.use('/api', progressRouter);
app.use('/api', knowledgeRouter);
app.use('/api', plannerRouter);
app.use('/api', calendarRouter);
app.use('/api', analyticsRouter);
app.use('/api', usersRouter);

/** ===== error handler (חייב להיות אחרון) ===== */
app.use(errorHandler);

export { app };
