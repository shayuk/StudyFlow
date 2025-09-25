// server/src/services/calendar.ts
import { prisma } from '../db';
import assert from 'node:assert';

export type Visibility = 'public' | 'course' | 'private';

export interface CreateCalendarEventInput {
  courseId: string;
  title: string;
  description?: string;
  startAt: string;     // ISO
  endAt: string;       // ISO
  timezone: string;    // IANA
  recurrenceRule?: string;
  location?: string;
  visibility?: Visibility;
  ownerUserId?: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  recurrenceRule?: string;
  location?: string;
  visibility?: Visibility;
}

function isIanaTz(tz: string): boolean {
  // Conservative check: Region/City, letters/underscores, optional third part
  return /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(tz);
}

function toDate(value: string, field: string): Date {
  const d = new Date(value);
  assert(!Number.isNaN(d.getTime()), `${field} must be a valid ISO datetime`);
  return d;
}

function validateCreate(input: CreateCalendarEventInput) {
  assert(typeof input.courseId === 'string' && input.courseId, 'courseId is required');
  assert(typeof input.title === 'string' && input.title.trim().length > 0, 'title is required');
  assert(typeof input.startAt === 'string', 'startAt is required');
  assert(typeof input.endAt === 'string', 'endAt is required');
  const start = toDate(input.startAt, 'startAt');
  const end = toDate(input.endAt, 'endAt');
  assert(start < end, 'startAt must be before endAt');
  assert(typeof input.timezone === 'string' && isIanaTz(input.timezone), 'timezone must be IANA string');
}

function validateUpdate(patch: UpdateCalendarEventInput) {
  if (patch.title !== undefined) {
    assert(patch.title.trim().length > 0, 'title cannot be empty');
  }
  if (patch.timezone !== undefined) {
    assert(isIanaTz(patch.timezone), 'timezone must be IANA string');
  }
  if (patch.startAt !== undefined) toDate(patch.startAt, 'startAt');
  if (patch.endAt !== undefined) toDate(patch.endAt, 'endAt');
}

export async function createEvent(input: CreateCalendarEventInput) {
  validateCreate(input);
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  return prisma.calendarEvent.create({
    data: {
      courseId: input.courseId,
      title: input.title.trim(),
      description: input.description ?? null,
      startAt: start,
      endAt: end,
      timezone: input.timezone,
      recurrenceRule: input.recurrenceRule ?? null,
      location: input.location ?? null,
      visibility: input.visibility ?? 'course',
      ownerUserId: input.ownerUserId ?? null,
    },
  });
}

export async function updateEvent(id: string, patch: UpdateCalendarEventInput) {
  validateUpdate(patch);
  const data: any = {};
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined) data.description = patch.description ?? null;
  if (patch.startAt !== undefined) data.startAt = new Date(patch.startAt);
  if (patch.endAt !== undefined) data.endAt = new Date(patch.endAt);
  if (patch.timezone !== undefined) data.timezone = patch.timezone;
  if (patch.recurrenceRule !== undefined) data.recurrenceRule = patch.recurrenceRule ?? null;
  if (patch.location !== undefined) data.location = patch.location ?? null;
  if (patch.visibility !== undefined) data.visibility = patch.visibility;

  if (data.startAt && data.endAt) {
    assert(data.startAt < data.endAt, 'startAt must be before endAt');
  }

  return prisma.calendarEvent.update({ where: { id }, data });
}

export async function deleteEvent(id: string) {
  await prisma.calendarEvent.delete({ where: { id } });
}

export async function getEventById(id: string) {
  return prisma.calendarEvent.findUnique({ where: { id } });
}

export async function listEventsByCourseAndRange(courseId: string, fromIso: string, toIso: string) {
  assert(typeof courseId === 'string' && courseId, 'courseId is required');
  const from = toDate(fromIso, 'from');
  const to = toDate(toIso, 'to');
  assert(from < to, 'from must be before to');

  // Events overlapping the window: startAt < to && endAt > from
  return prisma.calendarEvent.findMany({
    where: {
      courseId,
      startAt: { lt: to },
      endAt: { gt: from },
    },
    orderBy: { startAt: 'asc' },
  });
}
