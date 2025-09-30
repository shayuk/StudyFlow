import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  listEventsByCourseAndRange,
} from '../src/services/calendar';

function iso(y: number, m: number, d: number, hh = 0, mm = 0) {
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  return dt.toISOString();
}

describe.sequential('calendar service (create/update/list/delete)', () => {
  const ORG = 'org_cal_svc';
  let courseId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // cleanup for this org only
    await prisma.calendarEvent.deleteMany({ where: { course: { orgId: ORG } } }).catch(() => {});
    await prisma.course.deleteMany({ where: { orgId: ORG } }).catch(() => {});
    await prisma.org.deleteMany({ where: { id: ORG } }).catch(() => {});

    const org = await prisma.org.create({ data: { id: ORG, name: 'Org CalSvc' } });
    const course = await prisma.course.create({ data: { orgId: org.id, name: 'Calendar 101', code: 'CAL101' } });
    courseId = course.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('createEvent creates a valid event', async () => {
    const ev = await createEvent({
      courseId,
      title: 'Lecture',
      description: 'Intro',
      startAt: iso(2025, 9, 30, 9, 0),
      endAt: iso(2025, 9, 30, 10, 0),
      timezone: 'Europe/London',
      location: 'Room 1',
    });
    expect(ev.id).toBeTruthy();
    expect(ev.title).toBe('Lecture');
  });

  it('createEvent validates timezone and dates', async () => {
    await expect(
      createEvent({
        courseId,
        title: 'Bad tz',
        startAt: iso(2025, 9, 30, 9, 0),
        endAt: iso(2025, 9, 30, 8, 59), // end before start
        timezone: 'Europe/London',
      })
    ).rejects.toThrow(/startAt must be before endAt/);

    await expect(
      createEvent({
        courseId,
        title: 'Bad tz',
        startAt: iso(2025, 9, 30, 9, 0),
        endAt: iso(2025, 9, 30, 10, 0),
        timezone: 'Not/A-TZ',
      })
    ).rejects.toThrow(/timezone must be IANA/);
  });

  it('updateEvent patches fields and enforces constraints', async () => {
    const ev = await createEvent({
      courseId,
      title: 'Session',
      startAt: iso(2025, 10, 1, 12, 0),
      endAt: iso(2025, 10, 1, 13, 0),
      timezone: 'Etc/UTC',
    });

    const upd = await updateEvent(ev.id, { title: 'Session A', location: 'Lab' });
    expect(upd.title).toBe('Session A');

    await expect(updateEvent(ev.id, { timezone: 'BAD/TZ' })).rejects.toThrow(/IANA/);
  });

  it('listEventsByCourseAndRange returns events overlapping window', async () => {
    const a = await createEvent({
      courseId,
      title: 'A',
      startAt: iso(2025, 10, 2, 9, 0),
      endAt: iso(2025, 10, 2, 10, 0),
      timezone: 'Etc/UTC',
    });
    const b = await createEvent({
      courseId,
      title: 'B',
      startAt: iso(2025, 10, 2, 11, 0),
      endAt: iso(2025, 10, 2, 12, 0),
      timezone: 'Etc/UTC',
    });
    // Outside window, should not appear
    await createEvent({
      courseId,
      title: 'C',
      startAt: iso(2025, 10, 3, 9, 0),
      endAt: iso(2025, 10, 3, 10, 0),
      timezone: 'Etc/UTC',
    });

    const items = await listEventsByCourseAndRange(courseId, iso(2025, 10, 2, 8, 30), iso(2025, 10, 2, 12, 0));
    const ids = items.map((x) => x.id).sort();
    expect(ids).toEqual([a.id, b.id].sort());
  });

  it('deleteEvent removes the record', async () => {
    const ev = await createEvent({
      courseId,
      title: 'Tmp',
      startAt: iso(2025, 10, 4, 9, 0),
      endAt: iso(2025, 10, 4, 10, 0),
      timezone: 'Etc/UTC',
    });
    await deleteEvent(ev.id);
    const got = await getEventById(ev.id);
    expect(got).toBeNull();
  });
});
