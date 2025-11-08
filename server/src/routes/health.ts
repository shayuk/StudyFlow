import { Router, Request, Response } from 'express';
import express from 'express';
import { JWT_AUDIENCE, JWT_ISSUER } from '../config';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL === '1',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
});

router.get('/health/jwt', (_req: Request, res: Response) => {
  const secret = process.env.JWT_SECRET || '';
  res.status(200).json({
    hasSecret: secret.length >= 16,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    nodeEnv: process.env.NODE_ENV,
  });
});

router.get('/health/llm', (_req: Request, res: Response) => {
  res.status(200).json({
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    lecturerProvider: process.env.LECTURER_PROVIDER ?? 'anthropic',
    disableChatWithoutKeys: process.env.DISABLE_CHAT_WITHOUT_KEYS === 'true',
  });
});

export default router;
