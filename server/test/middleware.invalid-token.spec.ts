import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { authMiddleware, type AuthedRequest } from '../src/auth/middleware';

// Minimal protected app using the real auth middleware
function buildApp() {
  const app = express();
  app.get('/protected', authMiddleware, (req, res) => {
    const userId = (req as AuthedRequest).user?.sub;
    return res.status(200).json({ ok: true, userId });
  });
  return app;
}

describe('auth/middleware invalid token path', () => {
  it('returns 401 for malformed token', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });
});
