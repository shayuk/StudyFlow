import { apiFetch } from '@/lib/api';
import type { CourseCard } from './types';

export async function getMyCourses(page: number = 1, pageSize: number = 20): Promise<{ items: CourseCard[]; hasMore: boolean }>{
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  const res = await apiFetch(`courses/my?${qs}`);
  const hasMore = res.headers.get('X-Has-More') === 'true';
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }
  const data = await res.json();
  return { items: data as CourseCard[], hasMore };
}
