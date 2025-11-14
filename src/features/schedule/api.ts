import { apiFetch } from '@/lib/api';

export type CalendarEvent = { id: string; title: string; start: string; end?: string; allDay?: boolean };

export async function getMyEvents(range?: { start: string; end: string }): Promise<CalendarEvent[]> {
  const qs = range ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}` : '';
  const res = await apiFetch(`schedule/my${qs}`);
  if (res.status === 401 || !res.ok) return [];
  return res.json();
}
