import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db';
import progressRouter from '../src/routes/progress';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', progressRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG_A = 'org_prog_1';
const ORG_B = 'org_prog_2';
const studentA = () => token({ sub: 'u_prog_s1', orgId: ORG_A, roles: ['student'] });
const studentB = () => token({ sub: 'u_prog_s2', orgId: ORG_B, roles: ['student'] });

async function seedCourseA() {
  await prisma.org.upsert({ where: { id: ORG_A }, create: { id: ORG_A, name: 'Prog Org A' }, update: {} });
  const course = await prisma.course.create({ data: { name: 'Prog Course A', orgId: ORG_A } });
  return { course };
}

async function seedCourseB() {
  await prisma.org.upsert({ where: { id: ORG_B }, create: { id: ORG_B, name: 'Prog Org B' }, update: {} });
  const course = await prisma.course.create({ data: { name: 'Prog Course B', orgId: ORG_B } });
  return { course };
}

async function cleanup() {
  const ORGS = [ORG_A, ORG_B];
  await prisma.masterySnapshot.deleteMany({ where: { orgId: { in: ORGS } } });
  await prisma.course.deleteMany({ where: { orgId: { in: ORGS } } });
  await prisma.org.deleteMany({ where: { id: { in: ORGS } } });
}

describe.sequential('Progress routes (student GET, self-report POST)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('GET /api/progress/student returns empty initially', async () => {
    const res = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${studentA()}`)
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it('POST /api/progress/self-report validates and persists; GET returns snapshot', async () => {
    const { course } = await seedCourseA();

    // invalid score
    await request(app)
      .post('/api/progress/self-report')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ courseId: course.id, topic: 'algebra', score: 120 })
      .expect(400);

    // valid create
    const post1 = await request(app)
      .post('/api/progress/self-report')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ courseId: course.id, topic: 'algebra', score: 65 })
      .expect(200);
    expect(post1.body).toMatchObject({ orgId: ORG_A, courseId: course.id, topic: 'algebra', score: 65 });

    // update same key to new score
    const post2 = await request(app)
      .post('/api/progress/self-report')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ courseId: course.id, topic: 'algebra', score: 85 })
      .expect(200);
    expect(post2.body).toMatchObject({ score: 85 });

    // GET should include latest snapshot
    const get = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${studentA()}`)
      .expect(200);
    type Snapshot = { courseId: string; topic: string; score: number };
    const items = get.body.items as Snapshot[];
    const found = items.find((x) => x.courseId === course.id && x.topic === 'algebra');
    expect(found).toBeTruthy();
    expect(found.score).toBe(85);
  });

  it('Org scoping: cannot self-report to a course from another org, and GET does not include others', async () => {
    const { course: courseA } = await seedCourseA();
    const { course: courseB } = await seedCourseB();

    // Other org course: studentA cannot report
    await request(app)
      .post('/api/progress/self-report')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ courseId: courseB.id, topic: 'geometry', score: 50 })
      .expect(403);

    // Self org reporting OK
    await request(app)
      .post('/api/progress/self-report')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ courseId: courseA.id, topic: 'geometry', score: 50 })
      .expect(200);

    // GET for studentB should be empty
    const getB = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${studentB()}`)
      .expect(200);
    expect(getB.body.items.length).toBe(0);
  });
});
