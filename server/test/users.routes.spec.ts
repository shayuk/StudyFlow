import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db';
import usersRouter from '../src/routes/users';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', usersRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key_users';
  return signToken({ ...payload });
}

const adminA = () => token({ sub: 'u_admin_A', orgId: 'org_A', roles: ['admin'] });
const adminB = () => token({ sub: 'u_admin_B', orgId: 'org_B', roles: ['admin'] });
const studentA = () => token({ sub: 'u_student_A', orgId: 'org_A', roles: ['student'] });

async function seedOrgsAndUsers() {
  await prisma.user.deleteMany({ where: { orgId: { in: ['org_A', 'org_B'] } } });
  await prisma.org.deleteMany({ where: { id: { in: ['org_A', 'org_B'] } } });

  await prisma.org.createMany({ data: [{ id: 'org_A', name: 'Org A' }, { id: 'org_B', name: 'Org B' }] });

  // Org A: two admins + one student
  await prisma.user.createMany({
    data: [
      { id: 'uA1', orgId: 'org_A', email: 'a1@a', role: 'admin' },
      { id: 'uA2', orgId: 'org_A', email: 'a2@a', role: 'admin' },
      { id: 'uS1', orgId: 'org_A', email: 's1@a', role: 'student' },
    ],
  });

  // Org B: single admin only
  await prisma.user.create({ data: { id: 'uB1', orgId: 'org_B', email: 'b1@b', role: 'admin' } });
}

describe.sequential('Users routes (admin listing and role updates)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await seedOrgsAndUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/users requires auth (401)', async () => {
    await request(app).get('/api/users').expect(401);
  });

  it('GET /api/users forbidden for non-admin (403)', async () => {
    await request(app).get('/api/users').set('Authorization', `Bearer ${studentA()}`).expect(403);
  });

  it('GET /api/users returns only caller org users (200)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminA()}`).expect(200);
    const items = res.body.items as Array<{ id: string; role: string; email: string | null }>;
    expect(Array.isArray(items)).toBe(true);
    // Should include uA1,uA2,uS1 but not uB1
    const ids = items.map((u) => u.id).sort();
    expect(ids).toEqual(['uA1', 'uA2', 'uS1']);
  });

  it('PATCH /api/users/:id requires admin and same org', async () => {
    // Cross-org admin cannot modify org_A user
    await request(app)
      .patch('/api/users/uA1')
      .set('Authorization', `Bearer ${adminB()}`)
      .send({ role: 'student' })
      .expect(403);

    // Non-admin in same org forbidden
    await request(app)
      .patch('/api/users/uA1')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ role: 'student' })
      .expect(403);
  });

  it('PATCH /api/users/:id 404 for missing user', async () => {
    await request(app)
      .patch('/api/users/NOPE')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ role: 'student' })
      .expect(404);
  });

  it('PATCH /api/users/:id 400 for invalid role', async () => {
    await request(app)
      .patch('/api/users/uA1')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ role: 'teacher' })
      .expect(400);
  });

  it('PATCH allows updating from student to instructor/admin', async () => {
    const res = await request(app)
      .patch('/api/users/uS1')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ role: 'instructor' })
      .expect(200);
    expect(res.body).toMatchObject({ id: 'uS1', role: 'instructor' });
  });

  it('PATCH no-op returns 200 and unchanged role', async () => {
    const res = await request(app)
      .patch('/api/users/uA1')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(res.body).toMatchObject({ id: 'uA1', role: 'admin' });
  });

  it('PATCH blocks demoting the last admin in org (409)', async () => {
    // Org B has only one admin uB1; trying to demote should 409
    const r = await request(app)
      .patch('/api/users/uB1')
      .set('Authorization', `Bearer ${adminB()}`)
      .send({ role: 'student' })
      .expect(409);
    expect(r.body.error).toContain('last admin');
  });

  it('PATCH blocks self-demotion when only admin (409)', async () => {
    // Temporarily adjust org_B to have only uB1; already seeded as such.
    const r = await request(app)
      .patch('/api/users/uB1')
      .set('Authorization', `Bearer ${token({ sub: 'uB1', orgId: 'org_B', roles: ['admin'] })}`)
      .send({ role: 'student' })
      .expect(409);
    expect(r.body.error).toBeTruthy();
  });
});
