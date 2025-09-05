import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

import plannerRouter from '../src/routes/planner';
import { prisma } from '../src/db';
import { signToken, type JwtUser } from '../src/auth/jwt';

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

const ORG = 'org_planner_1';
const USER = 'u_planner_s1';
const student = () => token({ sub: USER, orgId: ORG, roles: ['student'] });

async function cleanup() {
  // Delete dependent sessions then plans in org
  const plans = await prisma.plan.findMany({ where: { orgId: ORG }, select: { id: true } });
  const ids = plans.map((p) => p.id);
  if (ids.length) {
    await prisma.planSession.deleteMany({ where: { planId: { in: ids } } });
    await prisma.plan.deleteMany({ where: { id: { in: ids } } });
  }
}

async function ensureOrgUser() {
  // Create Org and User rows to satisfy FK constraints
  await prisma.org.upsert({
    where: { id: ORG },
    update: {},
    create: { id: ORG, name: 'Planner Org' },
  });
  await prisma.user.upsert({
    where: { id: USER },
    update: {},
    create: { id: USER, orgId: ORG },
  });
}

describe.sequential('Planner routes', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanup();
    await ensureOrgUser();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('creates sessions within window and respects daily caps', async () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000); // 3 days window

    const res1 = await request(app)
      .post('/api/planner/plan')
      .set('Authorization', `Bearer ${student()}`)
      .send({
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        sessionMinutes: 45,
        dailyCap: 2,
        preferredStartHour: 9,
        preferredEndHour: 17,
        topics: ['math', 'physics'],
        description: 'study session',
      })
      .expect(201);

    const sessions = res1.body.sessions as Array<{ start: string; end: string; topic?: string }>;
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);

    // For 3 days * cap 2 = up to 6, but might be fewer if window tight; ensure none exceed 2 per day
    const perDayCount = new Map<string, number>();
    for (const s of sessions) {
      const d = new Date(s.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      perDayCount.set(key, (perDayCount.get(key) ?? 0) + 1);
      // Check hours within 9..17
      expect(d.getHours()).toBeGreaterThanOrEqual(9);
      expect(d.getHours()).toBeLessThanOrEqual(17);
    }
    for (const [, cnt] of perDayCount) {
      expect(cnt).toBeLessThanOrEqual(2);
    }
  });

  it('detects conflicts and returns 409 when overlapping existing sessions', async () => {
    // First, create a plan with one session at a specific time (manually)
    const baseDay = new Date();
    const day = new Date(baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate(), 10, 0, 0, 0);
    const end = new Date(day.getTime() + 45 * 60 * 1000);

    await ensureOrgUser();
    const plan = await prisma.plan.create({
      data: {
        orgId: ORG,
        userId: USER,
        fromDate: day,
        toDate: day,
      },
      select: { id: true },
    });
    await prisma.planSession.create({
      data: { planId: plan.id, start: day, end, status: 'scheduled' },
    });

    // Now request a new plan overlapping that same window -> should conflict 409
    const res = await request(app)
      .post('/api/planner/plan')
      .set('Authorization', `Bearer ${student()}`)
      .send({
        fromDate: day.toISOString(),
        toDate: day.toISOString(),
        sessionMinutes: 45, // will create 10:00-10:45 when start hour is 10
        dailyCap: 1,
        preferredStartHour: 10, // aligns to the existing session's start
        preferredEndHour: 17,
      })
      .expect(409);

    expect(res.body).toHaveProperty('error', 'conflicts');
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThan(0);
  });

  it('happy path persists plan and sessions', async () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/planner/plan')
      .set('Authorization', `Bearer ${student()}`)
      .send({
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        sessionMinutes: 30,
        dailyCap: 1,
        preferredStartHour: 8,
        preferredEndHour: 12,
      })
      .expect(201);

    const planId = res.body.planId as string;
    expect(typeof planId).toBe('string');

    const sessions = res.body.sessions as Array<{ start: string; end: string }>;
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);

    const count = await prisma.planSession.count({ where: { planId } });
    expect(count).toBe(sessions.length);
  });
});
