import { Router, Response } from 'express';
import express from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireRole } from '../auth/authorize';
import { prisma } from '../db';
import { z } from 'zod';

const router = Router();

// GET /api/users - list users within caller's org (admin only)
router.get('/users', authMiddleware, requireOrg(), requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const users = await prisma.user.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return res.status(200).json({ items: users });
});

// PATCH /api/users/:userId - update role (admin only)
router.patch('/users/:userId', authMiddleware, requireOrg(), requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { userId } = req.params as { userId: string };

  const schema = z.object({ role: z.enum(['student', 'instructor', 'admin']) });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return res.status(404).json({ error: 'user not found' });
  if (existing.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: user not in your org' });

  const nextRole = parsed.data.role;
  // No-op
  if (existing.role === nextRole) {
    return res.status(200).json({ id: existing.id, email: existing.email, name: existing.name, role: existing.role });
  }

  // Harden: prevent demoting the last admin in org (including self if only admin)
  if (existing.role === 'admin' && nextRole !== 'admin') {
    const otherAdmins = await prisma.user.count({
      where: { orgId, role: 'admin', NOT: { id: existing.id } },
    });
    if (otherAdmins === 0) {
      const self = req.user?.sub === existing.id;
      const reason = self ? 'cannot self-demote as the only admin' : 'cannot demote the last admin in the org';
      return res.status(409).json({ error: reason });
    }
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });
  return res.status(200).json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
});

export default router;
