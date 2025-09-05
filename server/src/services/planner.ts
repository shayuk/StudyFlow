// Planner service: generate plan sessions from constraints and detect conflicts
// Pure logic (no DB). Keeps with project patterns: clear types, simple, fast, testable.

export type IsoDateLike = string | number | Date;

export interface PlanConstraints {
  fromDate: IsoDateLike;           // inclusive day start
  toDate: IsoDateLike;             // inclusive day end
  sessionMinutes: number;          // duration per session in minutes (e.g., 45)
  dailyCap: number;                // max sessions per single day
  preferredStartHour?: number;     // e.g., 9 (09:00)
  preferredEndHour?: number;       // e.g., 18 (18:00)
  topics?: string[];               // optional topics to assign per session, cycles if shorter
  description?: string;            // optional description template
}

export interface SessionDraft {
  start: Date;
  end: Date;
  topic?: string;
  description?: string;
}

export interface Conflict {
  kind: 'overlap';
  a: { start: Date; end: Date };
  b: { start: Date; end: Date };
}

function atStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function clampToWindow(date: Date, startHour?: number, endHour?: number): Date {
  const x = new Date(date);
  if (typeof startHour === 'number') {
    // If time is before preferred start, shift to start
    if (x.getHours() < startHour) x.setHours(startHour, 0, 0, 0);
  }
  if (typeof endHour === 'number') {
    // If time is after preferred end, clamp to end
    if (x.getHours() > endHour) x.setHours(endHour, 0, 0, 0);
  }
  return x;
}

function minutes(n: number): number { return n * 60 * 1000; }

export function planSessions(constraints: PlanConstraints): SessionDraft[] {
  const from = atStartOfDay(new Date(constraints.fromDate));
  const to = atStartOfDay(new Date(constraints.toDate));
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return [];
  if (to < from) return [];

  const per = Math.max(1, Math.floor(constraints.sessionMinutes));
  const cap = Math.max(1, Math.floor(constraints.dailyCap));
  const prefStart = constraints.preferredStartHour;
  const prefEnd = constraints.preferredEndHour;
  const topics = Array.isArray(constraints.topics) && constraints.topics.length > 0 ? constraints.topics : undefined;
  const desc = constraints.description;

  const out: SessionDraft[] = [];
  let day = new Date(from);
  let topicIdx = 0;

  while (day <= to) {
    // Establish initial cursor for the day within the preferred window
    let cursor = clampToWindow(new Date(day), prefStart, prefEnd);

    for (let i = 0; i < cap; i++) {
      const start = new Date(cursor);
      const end = new Date(start.getTime() + minutes(per));

      // If preferredEndHour exists and this session would spill past it, stop placing more on this day
      if (typeof prefEnd === 'number' && end.getHours() > prefEnd) break;

      const topic = topics ? topics[topicIdx % topics.length] : undefined;
      topicIdx++;

      out.push({ start, end, topic, description: desc });

      // Move cursor forward by session duration; simple layout without gaps
      cursor = end;
    }

    day = addDays(day, 1);
  }

  return out;
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function detectConflicts(
  existing: Array<{ start: Date; end: Date }>,
  proposed: Array<{ start: Date; end: Date }>
): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const a of existing) {
    for (const b of proposed) {
      if (overlaps(a, b)) {
        conflicts.push({ kind: 'overlap', a, b });
      }
    }
  }
  return conflicts;
}
