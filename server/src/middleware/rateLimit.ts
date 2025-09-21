import type { NextFunction, Request, Response } from 'express';

// Very simple in-memory per-IP rate limit for local/test only
// Defaults: 60 requests / 60s per IP
const WINDOW_MS = 60_000;
const MAX_REQ = 60;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimitLocal(req: Request, res: Response, next: NextFunction) {
  // Only enforce outside production (dev/test). In prod, disable by default.
  if (process.env.NODE_ENV === 'production') return next();

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    res.setHeader('X-RateLimit-Limit', String(MAX_REQ));
    res.setHeader('X-RateLimit-Remaining', String(MAX_REQ - 1));
    res.setHeader('X-RateLimit-Reset', String(Math.floor((now + WINDOW_MS) / 1000)));
    return next();
  }

  if (b.count < MAX_REQ) {
    b.count += 1;
    res.setHeader('X-RateLimit-Limit', String(MAX_REQ));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MAX_REQ - b.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(b.resetAt / 1000)));
    return next();
  }

  // Too many requests
  const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({ error: 'rate limit exceeded' });
}
