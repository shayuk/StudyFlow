import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg } from '../auth/authorize';
import { prisma } from '../db';

const router = Router();

// GET /api/analytics/course/:courseId
// Returns minimal aggregates for a course within caller's org
// shape: { courseId, counts: { conversations, messages, participants }, lastActivity }
router.get(
  '/analytics/course/:courseId',
  authMiddleware,
  requireOrg(),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const { courseId } = req.params as { courseId: string };

    // Validate course exists and belongs to org
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'course not found' });
    if (course.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: course not in your org' });

    // Conversations in course
    const conversations = await prisma.conversation.count({ where: { orgId, courseId } });

    // Messages linked to those conversations
    const messages = await prisma.message.count({ where: { conversation: { orgId, courseId } } });

    // Distinct participants (by userId) in conversations of this course
    const distinctUsers = await prisma.conversation.findMany({
      where: { orgId, courseId },
      distinct: ['userId'],
      select: { userId: true },
    });
    const participants = distinctUsers.length;

    // Last activity = latest message timestamp in conversations of this course
    const latestMsg = await prisma.message.findFirst({
      where: { conversation: { orgId, courseId } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return res.status(200).json({
      courseId,
      counts: { conversations, messages, participants },
      lastActivity: latestMsg?.createdAt ?? null,
    });
  }
);

export default router;
