import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';

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
  const { name, code } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required (string)' });
  }
  if (code && typeof code !== 'string') {
    return res.status(400).json({ error: 'code must be string if provided' });
  }

  try {
    // Ensure the org exists (seedless DX). If not, create a placeholder name.
    await prisma.org.upsert({
      where: { id: orgId },
      create: { id: orgId, name: 'Demo Org' },
      update: {},
    });

    const created = await prisma.course.create({ data: { name, code, orgId } });
    return res.status(201).json({ id: created.id, name: created.name, code: created.code });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(409).json({ error: 'unique constraint or create failed', detail });
  }
});

// Update a course (name/code) within caller's org (allowed: instructor, admin)
router.patch('/courses/:courseId', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { courseId } = req.params as { courseId: string };
  const { name, code } = req.body ?? {};

  if (name !== undefined && typeof name !== 'string') {
    return res.status(400).json({ error: 'name must be string if provided' });
  }
  if (code !== undefined && typeof code !== 'string') {
    return res.status(400).json({ error: 'code must be string if provided' });
  }

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
    return res.status(200).json({ id: updated.id, name: updated.name, code: updated.code });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
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
    return res.status(204).send();
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(409).json({ error: 'delete failed', detail });
  }
});

export default router;
