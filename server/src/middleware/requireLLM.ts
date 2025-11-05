import type { Request, Response, NextFunction } from 'express';

const IN_PROD = process.env.NODE_ENV === 'production';

export default function requireLLM(req: Request, res: Response, next: NextFunction) {
  if (!IN_PROD) return next();
  const disable = process.env.DISABLE_CHAT_WITHOUT_KEYS === 'true' || process.env.VERCEL === '1';
  if (!disable) return next();

  const role = (req.body?.role || (req.query as any)?.role || '').toString();
  const wantsStream = ((req.headers['accept'] as string) || '').includes('text/event-stream') || (req.query as any)?.stream === '1';
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const provider = (req.body?.provider || (req.query as any)?.provider || '').toString();

  const effective = provider
    || (role === 'instructor' ? (hasAnthropic ? 'anthropic' : (hasOpenAI ? 'openai' : '')) : (hasOpenAI ? 'openai' : ''));

  if ((!hasOpenAI && effective === 'openai') || (!hasAnthropic && effective === 'anthropic')) {
    return res.status(503).json({
      code: 'LLM_KEYS_MISSING',
      message: 'שירות ה-AI אינו זמין זמנית (מפתח חסר בפריסה). פנו לאדמין.',
      stream: wantsStream,
    });
  }
  return next();
}
