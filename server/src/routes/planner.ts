import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireAnyRole, requireOrg } from '../auth/authorize';
import { prisma } from '../db';
import { planSessions, detectConflicts } from '../services/planner';

const router = Router();

// POST /api/planner/plan
// Generates sessions from constraints; detects conflicts; persists Plan + Sessions if no conflicts
router.post(
  '/planner/plan',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const userId = req.user!.sub;

    const {
      courseId,
      fromDate,
      toDate,
      sessionMinutes,
      dailyCap,
      preferredStartHour,
      preferredEndHour,
      topics,
      description,
    } = (req.body ?? {}) as Record<string, unknown>;

    // Minimal validation (follow existing style; avoid new deps like zod for now)
    if (!fromDate || !toDate) return res.status(400).json({ error: 'fromDate and toDate are required' });
    const from = new Date(String(fromDate));
    const to = new Date(String(toDate));
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return res.status(400).json({ error: 'invalid fromDate/toDate' });

    const minutes = Number(sessionMinutes);
    const cap = Number(dailyCap);
    if (!Number.isFinite(minutes) || minutes <= 0) return res.status(400).json({ error: 'sessionMinutes must be > 0' });
    if (!Number.isFinite(cap) || cap <= 0) return res.status(400).json({ error: 'dailyCap must be > 0' });

    const startHr = preferredStartHour === undefined ? undefined : Number(preferredStartHour);
    const endHr = preferredEndHour === undefined ? undefined : Number(preferredEndHour);
    if (startHr !== undefined && (!Number.isInteger(startHr) || startHr < 0 || startHr > 23)) {
      return res.status(400).json({ error: 'preferredStartHour must be an integer 0..23' });
    }
    if (endHr !== undefined && (!Number.isInteger(endHr) || endHr < 0 || endHr > 23)) {
      return res.status(400).json({ error: 'preferredEndHour must be an integer 0..23' });
    }
    if (startHr !== undefined && endHr !== undefined && endHr <= startHr) {
      return res.status(400).json({ error: 'preferredEndHour must be > preferredStartHour' });
    }

    const topicsArr = Array.isArray(topics) ? (topics as unknown[]).map(String).filter(Boolean) : undefined;
    const desc = description === undefined ? undefined : String(description);
    const courseIdStr = courseId === undefined ? undefined : String(courseId);

    // Load existing sessions in range, scoped by org+user (+optional course)
    // We filter PlanSession by related Plan fields and date overlap window
    const existing = await prisma.planSession.findMany({
      where: {
        plan: {
          orgId,
          userId,
          ...(courseIdStr ? { courseId: courseIdStr } : {}),
        },
        AND: [
          { start: { lte: to } },
          { end: { gte: from } },
        ],
      },
      select: { start: true, end: true },
      orderBy: { start: 'asc' },
    });

    const proposed = planSessions({
      fromDate: from,
      toDate: to,
      sessionMinutes: minutes,
      dailyCap: cap,
      preferredStartHour: startHr,
      preferredEndHour: endHr,
      topics: topicsArr,
      description: desc,
    });

    // Conflict detection
    const conflicts = detectConflicts(
      existing.map((x) => ({ start: new Date(x.start), end: new Date(x.end) })),
      proposed
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'conflicts', count: conflicts.length });
    }

    // Persist: Plan + Sessions
    try {
      const plan = await prisma.plan.create({
        data: {
          orgId,
          userId,
          courseId: courseIdStr,
          title: desc ? 'Planned Sessions' : null,
          constraints: JSON.stringify({
            fromDate: from.toISOString(),
            toDate: to.toISOString(),
            sessionMinutes: minutes,
            dailyCap: cap,
            preferredStartHour: startHr,
            preferredEndHour: endHr,
            topics: topicsArr,
            description: desc,
          }),
          fromDate: from,
          toDate: to,
        },
        select: { id: true },
      });

      if (proposed.length > 0) {
        await prisma.planSession.createMany({
          data: proposed.map((s) => ({
            planId: plan.id,
            start: s.start,
            end: s.end,
            topic: s.topic,
            description: s.description,
            status: 'scheduled',
          })),
        });
      }

      // Return sessions as response
      return res.status(201).json({
        planId: plan.id,
        sessions: proposed.map((s) => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          topic: s.topic,
          description: s.description,
          status: 'scheduled',
        })),
      });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'persist failed', detail });
    }
  }
);

export default router;
