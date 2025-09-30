import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';
import { logger } from '../logger';
import { z } from 'zod';

const router = Router();

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
