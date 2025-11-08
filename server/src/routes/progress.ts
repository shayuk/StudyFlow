import { Router, Response } from 'express';
import express from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';

const router = Router();

// GET /api/progress/student?courseId=&topic=
// Returns mastery snapshots for the current user within their org, optionally filtered
router.get(
  '/progress/student',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const userId = req.user!.sub;
    const { courseId, topic } = req.query as { courseId?: string; topic?: string };

    const items = await prisma.masterySnapshot.findMany({
      where: {
        orgId,
        userId,
        ...(courseId ? { courseId } : {}),
        ...(topic ? { topic } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({ items });
  }
);

// POST /api/progress/self-report { courseId, topic, score }
// Upserts latest snapshot for (orgId,userId,courseId,topic)
router.post(
  '/progress/self-report',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const userId = req.user!.sub;
    const { courseId, topic, score } = (req.body ?? {}) as {
      courseId?: string;
      topic?: string;
      score?: number;
    };

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ error: 'courseId is required (string)' });
    }
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required (string)' });
    }
    if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be a number between 0 and 100' });
    }

    // Ensure course belongs to same org
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'course not found' });
    if (course.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: course not in your org' });

    // Update latest snapshot for this key if exists, else create
    const existing = await prisma.masterySnapshot.findFirst({
      where: { orgId, userId, courseId, topic },
      orderBy: { updatedAt: 'desc' },
    });

    let snapshot;
    if (existing) {
      snapshot = await prisma.masterySnapshot.update({
        where: { id: existing.id },
        data: { score, updatedAt: new Date() },
      });
    } else {
      snapshot = await prisma.masterySnapshot.create({
        data: { orgId, userId, courseId, topic, score, color: scoreToColor(score) },
      });
    }

    return res.status(200).json(snapshot);
  }
);

function scoreToColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export default router;
