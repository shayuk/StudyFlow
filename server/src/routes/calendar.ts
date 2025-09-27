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
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || 'validation error') });
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
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || 'validation error') });
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
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || 'validation error') });
    }
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
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || 'validation error') });
    }
  }
);
