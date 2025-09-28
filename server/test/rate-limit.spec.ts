import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { rateLimitLocal } from '../src/middleware/rateLimit';

function buildAppWithRateLimit() {
  const app = express();
  app.use(express.json());
  app.get('/ping', rateLimitLocal, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe.sequential('rateLimitLocal middleware (dev/test only)', () => {
  const app = buildAppWithRateLimit();

  beforeAll(() => {
    // Ensure not production for this suite
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // leave env as-is for other tests
  });

  it('allows first 60 requests then returns 429 with headers', async () => {
    // Fixed IP to accumulate in same bucket
    const ip = '203.0.113.10';
    // First 60 should pass (limit defined in middleware)
    for (let i = 0; i < 60; i++) {
      const ok = await request(app).get('/ping').set('x-forwarded-for', ip);
      expect(ok.status, `index ${i}`).toBe(200);
    }

    const blocked = await request(app).get('/ping').set('x-forwarded-for', ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body).toMatchObject({ error: 'rate limit exceeded' });
  });

  it('is disabled when NODE_ENV=production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      // New app instance to capture env at request-time
      const prodApp = buildAppWithRateLimit();
      for (let i = 0; i < 65; i++) {
        const res = await request(prodApp).get('/ping').set('x-forwarded-for', '198.51.100.7');
        expect(res.status).toBe(200);
      }
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
