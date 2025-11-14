import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { createEvent, updateEvent, deleteEvent, getEventById, listEventsByCourseAndRange } from '../services/calendar';
import { prisma } from '../db';
import { getDemoFreeBusy } from '../services/calendarProviders';

const router = Router();

// Create (instructor/admin)
router.post(
  '/events',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const body = req.body ?? {};
    // Ensure course belongs to caller's org
    const course = await prisma.course.findUnique({ where: { id: String(body.courseId || '') } });
    if (!course) return res.status(404).json({ error: 'course not found' });
    if (course.orgId !== req.user!.orgId) return res.status(403).json({ error: 'Forbidden: course not in your org' });

    try {
      const saved = await createEvent({
        courseId: body.courseId,
        title: body.title,
        description: body.description,
        startAt: body.startAt,
        endAt: body.endAt,
        timezone: body.timezone,
        recurrenceRule: body.recurrenceRule,
        location: body.location,
        visibility: body.visibility,
        ownerUserId: req.user!.sub,
      });
      return res.status(201).json(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'validation error';
      return res.status(400).json({ error: msg });
    }
  }
);

// Read one (respect org)
router.get(
  '/events/:id',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const ev = await getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    const course = await prisma.course.findUnique({ where: { id: ev.courseId } });
    if (!course || course.orgId !== req.user!.orgId) return res.status(403).json({ error: 'Forbidden' });
    return res.status(200).json(ev);
  }
);

// Update (instructor/admin)
router.patch(
  '/events/:id',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const ev = await getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    const course = await prisma.course.findUnique({ where: { id: ev.courseId } });
    if (!course || course.orgId !== req.user!.orgId) return res.status(403).json({ error: 'Forbidden' });

    try {
      const patched = await updateEvent(req.params.id, req.body ?? {});
      return res.status(200).json(patched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'validation error';
      return res.status(400).json({ error: msg });
    }
  }
);

// Delete (instructor/admin)
router.delete(
  '/events/:id',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const ev = await getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    const course = await prisma.course.findUnique({ where: { id: ev.courseId } });
    if (!course || course.orgId !== req.user!.orgId) return res.status(403).json({ error: 'Forbidden' });

    await deleteEvent(req.params.id);
    return res.status(204).end();
  }
);

// List by course and range
router.get(
  '/events',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const courseId = String(req.query.courseId || '');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'course not found' });
    if (course.orgId !== req.user!.orgId) return res.status(403).json({ error: 'Forbidden: course not in your org' });

    try {
      const items = await listEventsByCourseAndRange(courseId, from, to);
      return res.status(200).json({ items });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'validation error';
      return res.status(400).json({ error: msg });
    }
  }
);

router.get(
  '/schedule/my',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const userId = req.user!.sub;
    const { start, end } = req.query as { start?: string; end?: string };

    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return res.status(400).json({ error: 'invalid_range' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId, course: { orgId } },
      select: { courseId: true },
    });
    if (!enrollments.length) {
      return res.status(200).json([]);
    }

    const courseIds = Array.from(new Set(enrollments.map(e => e.courseId)));
    const events = await prisma.calendarEvent.findMany({
      where: {
        courseId: { in: courseIds },
        startAt: { lt: endDate },
        endAt: { gt: startDate },
      },
      orderBy: { startAt: 'asc' },
    });

    const payload = events.map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.startAt.toISOString(),
      end: ev.endAt.toISOString(),
      allDay: false,
    }));
    return res.status(200).json(payload);
  }
);

export default router;

// GET /api/calendar/freebusy?from=...&to=...
// Local-only demo: returns cached busy windows for the current user/org (no OAuth)
router.get(
  '/freebusy',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!from || !to) return res.status(400).json({ error: 'from and to are required ISO datetime strings' });
    const fromD = new Date(from);
    const toD = new Date(to);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return res.status(400).json({ error: 'from/to must be valid ISO datetime strings' });
    }
    if (fromD >= toD) {
      return res.status(400).json({ error: 'from must be before to' });
    }

    try {
      const items = await getDemoFreeBusy(req.user!.orgId, req.user!.sub, from, to);
      return res.status(200).json({
        items: items.map(x => ({ start: x.start.toISOString(), end: x.end.toISOString() }))
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'validation error';
      return res.status(400).json({ error: msg });
    }
  }
);
