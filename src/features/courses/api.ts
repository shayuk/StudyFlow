import { fetchJson } from '@/lib/api';
import type { CourseCard } from './types';

export async function getMyCourses(): Promise<CourseCard[]> {
  return fetchJson<CourseCard[]>('/api/courses/my', { credentials: 'include' });
}
