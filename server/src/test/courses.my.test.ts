import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db';

// Helper to toggle DEV auth mode per test
const setDevAuth = (on: boolean) => { process.env.DEV_AUTH_MODE = on ? 'true' : 'false'; };

// Keep original prisma method to restore after tests
const originalFindMany = prisma.enrollment.findMany.bind(prisma.enrollment);

// Utility: set dev headers for a request
const devHeaders = (userId: string, orgId: string, role: 'student'|'instructor'|'admin' = 'student') => ({
  'x-user-id': userId,
  'x-org-id': orgId,
  'x-role': role,
});

describe('GET /api/courses/my', () => {
  beforeEach(() => {
    // Default to DEV auth enabled for most tests
    setDevAuth(true);
  });

  after(() => {
    // Restore original prisma behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = originalFindMany;
  });

  it('401 when missing/invalid auth (DEV auth disabled)', async () => {
    setDevAuth(false);
    const res = await request(app).get('/api/courses/my');
    assert.equal(res.status, 401);
  });

  it('isolates by (userId, orgId)', async () => {
    // Mock DB to return page slice — server already filters by userId+orgId
    // We just verify response shape and that our stub was called with filter containing userId and orgId via course.orgId
    let receivedWhere: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async (args: any) => {
      receivedWhere = args?.where;
      return [
        { course: { id: 'c1', name: 'A1', code: 'X1' } },
        { course: { id: 'c2', name: 'A2', code: 'X2' } },
      ];
    };

    const userId = 'userA';
    const orgId = 'orgX';

    const res = await request(app)
      .get('/api/courses/my?page=1&pageSize=20')
      .set(devHeaders(userId, orgId));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.every((it: any) => it && it.id && it.name));

    // Ensure server passed both userId and orgId into where clause
    const where = receivedWhere as { userId: string; course: { orgId: string } };
    assert.equal(where.userId, userId);
    assert.equal(where.course.orgId, orgId);
  });

  it('hides code for student, shows for staff', async () => {
    // 1) student
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1', code: 'SECRET' } } ];
    const resStudent = await request(app)
      .get('/api/courses/my')
      .set(devHeaders('stu1', 'org1', 'student'));
    assert.equal(resStudent.status, 200);
    assert.ok(Array.isArray(resStudent.body));
    assert.equal('code' in resStudent.body[0], false);

    // 2) instructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1', code: 'SECRET' } } ];
    const resStaff = await request(app)
      .get('/api/courses/my')
      .set(devHeaders('ins1', 'org1', 'instructor'));
    assert.equal(resStaff.status, 200);
    assert.equal(resStaff.body[0].code, 'SECRET');
  });

  it('paginates with offset without duplicates', async () => {
    // Page 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1' } } ];
    const p1 = await request(app)
      .get('/api/courses/my?page=1&pageSize=1')
      .set(devHeaders('u1', 'o1'));
    assert.equal(p1.status, 200);

    // Page 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c2', name: 'A2' } } ];
    const p2 = await request(app)
      .get('/api/courses/my?page=2&pageSize=1')
      .set(devHeaders('u1', 'o1'));
    assert.equal(p2.status, 200);

    assert.notEqual(p1.body[0].id, p2.body[0].id);
  });

  it('sets Cache-Control and returns 304 with matching ETag', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1' } } ];
    const first = await request(app)
      .get('/api/courses/my')
      .set(devHeaders('u2', 'o2'));
    assert.equal(first.status, 200);
    assert.equal(first.headers['cache-control'], 'private, no-store');
    const etag = first.headers.etag as string | undefined;
    assert.ok(etag);

    const second = await request(app)
      .get('/api/courses/my')
      .set('If-None-Match', etag || '')
      .set(devHeaders('u2', 'o2'));
    assert.equal(second.status, 304);
  });

  it('sets X-Has-More=false when list shorter than pageSize+1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1', instructor: 'T' } } ];
    const r = await request(app)
      .get('/api/courses/my?page=1&pageSize=20')
      .set(devHeaders('u3', 'o3', 'student'));
    assert.equal(r.status, 200);
    assert.equal(r.headers['x-has-more'], 'false');
  });

  it('role change invalidates ETag (student -> instructor)', async () => {
    // First request as student
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1', code: 'SECRET', instructor: 'T' } } ];
    const asStudent = await request(app)
      .get('/api/courses/my')
      .set(devHeaders('u4', 'o4', 'student'));
    assert.equal(asStudent.status, 200);
    const etag = asStudent.headers.etag as string | undefined;
    assert.ok(etag);

    // Same data, different role header with If-None-Match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.enrollment.findMany as any) = async () => [ { course: { id: 'c1', name: 'A1', code: 'SECRET', instructor: 'T' } } ];
    const asInstructor = await request(app)
      .get('/api/courses/my')
      .set('If-None-Match', etag || '')
      .set(devHeaders('u4', 'o4', 'instructor'));
    assert.equal(asInstructor.status, 200); // not 304
    assert.equal(asInstructor.body[0].code, 'SECRET');
  });
});
