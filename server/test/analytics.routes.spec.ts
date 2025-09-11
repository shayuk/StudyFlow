import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db';
import analyticsRouter from '../src/routes/analytics';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', analyticsRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG = 'org_analytics_1';
const admin = () => token({ sub: 'u_admin_x', orgId: ORG, roles: ['admin'] });

describe.sequential('Analytics routes', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // clean relevant data for org
    await prisma.message.deleteMany({ where: { conversation: { orgId: ORG } } });
    await prisma.conversation.deleteMany({ where: { orgId: ORG } });
    await prisma.enrollment.deleteMany({ where: { user: { orgId: ORG } } });
    await prisma.course.deleteMany({ where: { orgId: ORG } });
    await prisma.org.deleteMany({ where: { id: ORG } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/analytics/course/:courseId returns aggregates for course', async () => {
    // seed org and course
    await prisma.org.create({ data: { id: ORG, name: 'Analytics Org' } });
    const course = await prisma.course.create({ data: { name: 'Algebra', orgId: ORG } });

    // 2 conversations in course, 3 messages total, 2 distinct users
    const conv1 = await prisma.conversation.create({
      data: { orgId: ORG, botInstanceId: 'bi1', userId: 'u1', role: 'student', courseId: course.id },
    });
    const conv2 = await prisma.conversation.create({
      data: { orgId: ORG, botInstanceId: 'bi1', userId: 'u2', role: 'student', courseId: course.id },
    });

    await prisma.message.create({ data: { conversationId: conv1.id, sender: 'user', content: 'hi' } });
    await prisma.message.create({ data: { conversationId: conv1.id, sender: 'bot', content: 'hello' } });
    await prisma.message.create({ data: { conversationId: conv2.id, sender: 'user', content: 'help' } });

    const res = await request(app)
      .get(`/api/analytics/course/${course.id}`)
      .set('Authorization', `Bearer ${admin()}`)
      .expect(200);

    expect(res.body).toMatchObject({
      courseId: course.id,
      counts: { conversations: 2, messages: 3, participants: 2 },
    });
    expect(res.body.lastActivity).toBeTruthy();
  });

  it('returns 403 when course from another org', async () => {
    await prisma.org.create({ data: { id: ORG, name: 'Analytics Org' } });
    const otherOrg = await prisma.org.create({ data: { name: 'Other' } });
    const courseOther = await prisma.course.create({ data: { name: 'X', orgId: otherOrg.id } });

    const res = await request(app)
      .get(`/api/analytics/course/${courseOther.id}`)
      .set('Authorization', `Bearer ${admin()}`)
      .expect(403);

    expect(res.body).toHaveProperty('error');
  });
});
