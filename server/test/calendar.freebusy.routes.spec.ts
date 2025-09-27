import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import calendarRouter from '../src/routes/calendar';
import { prisma } from '../src/db';
import { signToken, type JwtUser } from '../src/auth/jwt';

// Mock provider to make output deterministic
vi.mock('../src/services/calendarProviders', () => {
  return {
    getDemoFreeBusy: vi.fn(async () => [
      { start: new Date('2024-01-01T12:00:00.000Z'), end: new Date('2024-01-01T13:00:00.000Z') },
      { start: new Date('2024-01-01T16:00:00.000Z'), end: new Date('2024-01-01T17:00:00.000Z') },
    ]),
  };
});

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api/calendar', calendarRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG = 'org_cal_fb_1';
const USER = 'u_cal_fb_1';
const anyUser = () => token({ sub: USER, orgId: ORG, roles: ['student'] });

describe.sequential('Calendar freebusy route', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/calendar/freebusy returns ISO items for valid range', async () => {
    const res = await request(app)
      .get('/api/calendar/freebusy?from=2024-01-01T00:00:00.000Z&to=2024-01-02T00:00:00.000Z')
      .set('Authorization', `Bearer ${anyUser()}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const it of res.body.items) {
      expect(typeof it.start).toBe('string');
      expect(typeof it.end).toBe('string');
      // Basic ISO check
      expect(it.start.includes('T')).toBe(true);
      expect(it.end.includes('T')).toBe(true);
    }
  });

  it('400 when missing from/to', async () => {
    await request(app)
      .get('/api/calendar/freebusy?from=2024-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${anyUser()}`)
      .expect(400);

    await request(app)
      .get('/api/calendar/freebusy?to=2024-01-02T00:00:00.000Z')
      .set('Authorization', `Bearer ${anyUser()}`)
      .expect(400);
  });

  it('401 when missing Authorization', async () => {
    await request(app)
      .get('/api/calendar/freebusy?from=2024-01-01T00:00:00.000Z&to=2024-01-02T00:00:00.000Z')
      .expect(401);
  });
});
