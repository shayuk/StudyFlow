import { apiFetch } from '@/lib/api';

export type TopicStatus = 'חזק' | 'ממוצע' | 'דורש חיזוק';
export type TopicSummary = { label: string; status: TopicStatus };

export async function getMyTopicSummary(): Promise<TopicSummary[]> {
  const res = await apiFetch('analytics/topics');
  if (res.status === 401 || !res.ok) return [];
  return res.json();
}
