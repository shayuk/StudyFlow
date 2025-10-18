export type TopicStatus = 'חזק' | 'ממוצע' | 'דורש חיזוק';
export type TopicSummary = { label: string; status: TopicStatus };

export async function getMyTopicSummary(): Promise<TopicSummary[]> {
  const res = await fetch('/api/analytics/topics', { credentials: 'include' });
  if (res.status === 401 || !res.ok) return [];
  return res.json();
}
