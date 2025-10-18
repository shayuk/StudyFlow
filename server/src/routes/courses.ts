import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';
import { logger } from '../logger';
import { z } from 'zod';

const router = Router();

// Read-only: current user's courses (enrollments)
router.get('/courses/my', authMiddleware, requireOrg(), async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub;
  const orgId = req.user!.orgId;
  const roles = req.user!.roles || [];
  const isStaff = roles.includes('instructor') || roles.includes('admin');
  const roleMask = [...roles].sort().join(',');

  // Clamp pagination
  const rawPage = Number(req.query.page ?? 1);
  const rawPageSize = Number(req.query.pageSize ?? 20);
  const page = Math.max(1, (rawPage | 0));
  const pageSize = Math.min(50, Math.max(1, (rawPageSize | 0)));
  const skip = (page - 1) * pageSize;

  // DB-level filter by userId and orgId through course relation
  const where = { userId, course: { orgId } } as const;

  // Fetch one extra to compute hasMore
  const rowsPlusOne = await prisma.enrollment.findMany({
    where,
    include: {
      course: {
        select: isStaff
          ? { id: true, name: true, code: true }
          : { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize + 1,
  });

  const hasMore = rowsPlusOne.length > pageSize;
  const rows = hasMore ? rowsPlusOne.slice(0, pageSize) : rowsPlusOne;

  // Masking for students (defensive)
  const payload = rows.map(e => ({
    id: e.course.id,
    name: e.course.name,
    ...(isStaff ? { code: (e.course as any).code ?? undefined } : {}),
    instructor: undefined as string | undefined,
    progress: null as number | null,
  }));

  // Headers
  res.set('Cache-Control', 'private, no-store');
  res.set('Vary', 'Authorization');
  res.set('X-Page', String(page));
  res.set('X-PageSize', String(pageSize));
  res.set('X-Has-More', String(hasMore));

  // Weak ETag aware of user/org/roles/page/size/payload
  const etagInput = JSON.stringify({ u: userId, o: orgId, r: roleMask, p: page, s: pageSize, d: payload });
  const weak = 'W/"' + crypto.createHash('sha1').update(etagInput).digest('hex') + '"';
  if (req.headers['if-none-match'] === weak) {
    return res.status(304).end();
  }
  res.set('ETag', weak);

  return res.status(200).json(payload);
});

// List courses within the caller's org
router.get('/courses', authMiddleware, requireOrg(), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const courses = await prisma.course.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, code: true, createdAt: true },
  });
  return res.status(200).json({ items: courses });
});

// Create a course within the caller's org (allowed: instructor, admin)
router.post('/courses', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const schema = z.object({
    name: z.string().min(1, 'name is required (string)'),
    code: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { name, code } = parsed.data;

  try {
    // Ensure the org exists (seedless DX). If not, create a placeholder name.
    await prisma.org.upsert({
      where: { id: orgId },
      create: { id: orgId, name: 'Demo Org' },
      update: {},
    });

    const created = await prisma.course.create({ data: { name, code, orgId } });
    logger.info({ orgId, courseId: created.id, route: 'POST /api/courses' }, 'Course created');
    return res.status(201).json({ id: created.id, name: created.name, code: created.code });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ orgId, err: detail, route: 'POST /api/courses' }, 'Course create failed');
    return res.status(409).json({ error: 'unique constraint or create failed', detail });
  }
});

// Update a course (name/code) within caller's org (allowed: instructor, admin)
router.patch('/courses/:courseId', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { courseId } = req.params as { courseId: string };
  const schema = z.object({
    name: z.string().optional(),
    code: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { name, code } = parsed.data;

  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) {
    return res.status(404).json({ error: 'course not found' });
  }
  if (existing.orgId !== orgId) {
    return res.status(403).json({ error: 'Forbidden: course not in your org' });
  }

  try {
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
      },
    });
    logger.info({ orgId, courseId: updated.id, route: 'PATCH /api/courses/:courseId' }, 'Course updated');
    return res.status(200).json({ id: updated.id, name: updated.name, code: updated.code });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ orgId, courseId, err: detail, route: 'PATCH /api/courses/:courseId' }, 'Course update failed');
    return res.status(409).json({ error: 'update failed (maybe unique code)', detail });
  }
});

// Delete a course within caller's org (allowed: instructor, admin)
router.delete('/courses/:courseId', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { courseId } = req.params as { courseId: string };

  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) {
    return res.status(404).json({ error: 'course not found' });
  }
  if (existing.orgId !== orgId) {
    return res.status(403).json({ error: 'Forbidden: course not in your org' });
  }

  try {
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });
    logger.info({ orgId, courseId, route: 'DELETE /api/courses/:courseId' }, 'Course deleted');
    return res.status(204).send();
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ orgId, courseId, err: detail, route: 'DELETE /api/courses/:courseId' }, 'Course delete failed');
    return res.status(409).json({ error: 'delete failed', detail });
  }
});

export default router;
