import express from 'express';
import request from 'supertest';
import { prisma } from '../src/db';
import coursesRouter from '../src/routes/courses';
import { signToken, JwtUser } from '../src/auth/jwt';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

type CourseOut = { id: string; name: string; code: string | null };

// Build a minimal app for testing, mounting only the courses router under /api
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', coursesRouter);
  return app;
}

// Helper to issue tokens
function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  // Ensure JWT secret exists for tests
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const adminA = () => token({ sub: 'u_admin_1', orgId: 'org_demo_1', roles: ['admin'] });
const instrA = () => token({ sub: 'u_instr_1', orgId: 'org_demo_1', roles: ['instructor'] });
const studentA = () => token({ sub: 'u_stud_1', orgId: 'org_demo_1', roles: ['student'] });
const adminB = () => token({ sub: 'u_admin_2', orgId: 'org_demo_2', roles: ['admin'] });

describe.sequential('Courses routes (CRUD + auth)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    // Ensure DB is reachable
    await prisma.$connect();
  });

  it('PATCH 404 when course not found', async () => {
    const nonExistentId = 'course_missing_404';
    await request(app)
      .patch(`/api/courses/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Nope' })
      .expect(404);
  });

  beforeEach(async () => {
    // Clean only data for this suite's orgs to avoid interfering with other specs
    const ORGS = ['org_demo_1', 'org_demo_2'];
    await prisma.enrollment.deleteMany({ where: { course: { orgId: { in: ORGS } } } });
    await prisma.course.deleteMany({ where: { orgId: { in: ORGS } } });
    await prisma.org.deleteMany({ where: { id: { in: ORGS } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/courses returns empty list initially', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it('POST /api/courses creates a course for admin', async () => {
    const uniqueCode = `DB${Date.now()}`;
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Intro to Databases', code: uniqueCode })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Intro to Databases', code: uniqueCode });
    expect(typeof res.body.id).toBe('string');

    const list = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);
    expect(list.body.items.length).toBe(1);
  });

  it('POST /api/courses forbids student (403)', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ name: 'Should Fail', code: 'FAIL1' })
      .expect(403);
  });

  it('401 when missing Authorization header (GET and POST)', async () => {
    await request(app)
      .get('/api/courses')
      .expect(401);

    await request(app)
      .post('/api/courses')
      .send({ name: 'No Token', code: 'NT1' })
      .expect(401);
  });

  it('PATCH updates name/code for admin; 403 when other org', async () => {
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instrA()}`)
      .send({ name: 'Course X', code: 'CX1' })
      .expect(201);

    const id = created.body.id as string;

    const upd = await request(app)
      .patch(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Course X Updated', code: 'CX1A' })
      .expect(200);
    expect(upd.body).toMatchObject({ id, name: 'Course X Updated', code: 'CX1A' });

    // Same id but admin from other org -> 403
    await request(app)
      .patch(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminB()}`)
      .send({ name: 'Nope' })
      .expect(403);
  });

  it('DELETE removes a course for admin', async () => {
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'To Delete', code: 'DEL101' })
      .expect(201);

    const id = created.body.id as string;

    await request(app)
      .delete(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(204);

    // Verify gone
    const list = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);
    const items: CourseOut[] = list.body.items as CourseOut[];
    expect(items.find((c) => c.id === id)).toBeUndefined();
  });

  it('DELETE with other org returns 403', async () => {
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Cross Org', code: 'XORG1' })
      .expect(201);

    const id = created.body.id as string;

    await request(app)
      .delete(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminB()}`)
      .expect(403);
  });

  it('code must be unique (409 on duplicate)', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'A', code: 'UNIQ1' })
      .expect(201);

    const dup = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'B', code: 'UNIQ1' })
      .expect(409);
    expect(dup.body.error).toBeTruthy();
  });

  it('POST validation 400 when name missing or wrong type', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ code: 'NONAME1' })
      .expect(400);

    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      // deliberately wrong type
      .send({ name: 123 as unknown as string, code: 'BADTYPE1' })
      .expect(400);
  });

  it('PATCH validation 400 when invalid types provided', async () => {
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Valid', code: 'V1' })
      .expect(201);

    const id = created.body.id as string;

    await request(app)
      .patch(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminA()}`)
      // wrong type on purpose
      .send({ name: 42 as unknown as string })
      .expect(400);

    await request(app)
      .patch(`/api/courses/${id}`)
      .set('Authorization', `Bearer ${adminA()}`)
      // wrong type on purpose
      .send({ code: 999 as unknown as string })
      .expect(400);
  });
});
