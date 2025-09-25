// server/src/services/calendarProviders.ts
// Demo calendar provider interface and stub implementation for free/busy.
// Local-only, no OAuth. Returns cached/demo data windows.

export interface FreeBusyWindow {
  start: Date;
  end: Date;
  busyOnly?: boolean; // always true in demo
}

// Simple demo provider: returns two busy windows per day within the range:
// 12:00-13:00 and 16:00-17:00 in the user's presumed local timezone (ISO input)
export async function getDemoFreeBusy(
  orgId: string,
  userId: string,
  fromIso: string,
  toIso: string
): Promise<FreeBusyWindow[]> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return [];

  const out: FreeBusyWindow[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    const day = new Date(cursor);
    // 12:00 - 13:00
    const s1 = new Date(day);
    s1.setHours(12, 0, 0, 0);
    const e1 = new Date(day);
    e1.setHours(13, 0, 0, 0);

    // 16:00 - 17:00
    const s2 = new Date(day);
    s2.setHours(16, 0, 0, 0);
    const e2 = new Date(day);
    e2.setHours(17, 0, 0, 0);

    if (s1 < to && e1 > from) out.push({ start: s1, end: e1, busyOnly: true });
    if (s2 < to && e2 > from) out.push({ start: s2, end: e2, busyOnly: true });

    // next day
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}
