import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireAnyRole, requireOrg } from '../auth/authorize';
import { prisma } from '../db';
import { planSessions, detectConflicts } from '../services/planner';
import { getDemoFreeBusy } from '../services/calendarProviders';
import { z } from 'zod';
import { logger } from '../logger';

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

    const schema = z.object({
      courseId: z.string().optional(),
      fromDate: z.string().min(1),
      toDate: z.string().min(1),
      sessionMinutes: z.number().int().positive({ message: 'sessionMinutes must be > 0' }),
      dailyCap: z.number().int().positive({ message: 'dailyCap must be > 0' }),
      preferredStartHour: z.number().int().min(0).max(23).optional(),
      preferredEndHour: z.number().int().min(0).max(23).optional(),
      topics: z.array(z.string()).optional(),
      description: z.string().optional(),
    }).refine((data) => {
      if (data.preferredStartHour !== undefined && data.preferredEndHour !== undefined) {
        return data.preferredEndHour > data.preferredStartHour;
      }
      return true;
    }, { message: 'preferredEndHour must be > preferredStartHour', path: ['preferredEndHour'] });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'invalid body';
      return res.status(400).json({ error: msg });
    }

    const {
      courseId: courseIdStr,
      fromDate,
      toDate,
      sessionMinutes: minutes,
      dailyCap: cap,
      preferredStartHour: startHr,
      preferredEndHour: endHr,
      topics: topicsArr,
      description: desc,
    } = parsed.data;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return res.status(400).json({ error: 'invalid fromDate/toDate' });

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

    // Also load free/busy windows for the same range (local demo provider)
    const busy = await getDemoFreeBusy(orgId, userId, from.toISOString(), to.toISOString());

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

    // Conflict detection: consider both existing sessions and busy windows
    const existingRanges = existing.map((x) => ({ start: new Date(x.start), end: new Date(x.end) }));
    const busyRanges = busy.map((b) => ({ start: b.start, end: b.end }));
    const conflicts = detectConflicts(
      [...existingRanges, ...busyRanges],
      proposed
    );
    if (conflicts.length > 0) {
      logger.warn({ orgId, userId, conflicts: conflicts.length, route: 'POST /api/planner/plan' }, 'Planner conflicts');
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
      logger.info({ orgId, userId, planId: plan.id, sessions: proposed.length, route: 'POST /api/planner/plan' }, 'Planner created');
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
      logger.error({ orgId, userId, err: detail, route: 'POST /api/planner/plan' }, 'Planner persist failed');
      return res.status(500).json({ error: 'persist failed', detail });
    }
  }
);

export default router;
