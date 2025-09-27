import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

import plannerRouter from '../src/routes/planner';
import { prisma } from '../src/db';
import { signToken, type JwtUser } from '../src/auth/jwt';

// --- Mock calendarProviders to control free/busy windows ---
vi.mock('../src/services/calendarProviders', () => {
  return {
    getDemoFreeBusy: vi.fn(async () => busyMock),
  };
});

// Will be mutated per-test
let busyMock: Array<{ start: Date; end: Date }> = [];

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', plannerRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG = 'org_planner_fb';
const USER = 'u_planner_fb1';
const student = () => token({ sub: USER, orgId: ORG, roles: ['student'] });

async function cleanup() {
  const plans = await prisma.plan.findMany({ where: { orgId: ORG }, select: { id: true } });
  const ids = plans.map((p) => p.id);
  if (ids.length) {
    await prisma.planSession.deleteMany({ where: { planId: { in: ids } } });
    await prisma.plan.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.user.deleteMany({ where: { id: USER } }).catch(() => {});
  await prisma.org.deleteMany({ where: { id: ORG } }).catch(() => {});
}

async function ensureOrgUser() {
  await prisma.org.upsert({ where: { id: ORG }, update: {}, create: { id: ORG, name: 'Planner Org FB' } });
  await prisma.user.upsert({ where: { id: USER }, update: {}, create: { id: USER, orgId: ORG } });
}

describe.sequential('Planner integrates free/busy windows', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanup();
    await ensureOrgUser();
    busyMock = [];
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('returns 409 when proposed sessions overlap busy windows', async () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

    // Busy window 10:00-11:00 on the day
    const s1 = new Date(from);
    s1.setHours(10, 0, 0, 0);
    const e1 = new Date(from);
    e1.setHours(11, 0, 0, 0);
    busyMock = [{ start: s1, end: e1 }];

    // Ask planner to start at 10 so it will clash
    const res = await request(app)
      .post('/api/planner/plan')
      .set('Authorization', `Bearer ${student()}`)
      .send({
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        sessionMinutes: 45,
        dailyCap: 1,
        preferredStartHour: 10,
        preferredEndHour: 17,
      })
      .expect(409);

    expect(res.body).toHaveProperty('error', 'conflicts');
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThan(0);
  });

  it('returns 201 when there are no busy windows', async () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

    busyMock = []; // no busy

    const res = await request(app)
      .post('/api/planner/plan')
      .set('Authorization', `Bearer ${student()}`)
      .send({
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        sessionMinutes: 45,
        dailyCap: 1,
        preferredStartHour: 9,
        preferredEndHour: 17,
      })
      .expect(201);

    const sessions = res.body.sessions as Array<{ start: string; end: string }>; 
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
  });
});
