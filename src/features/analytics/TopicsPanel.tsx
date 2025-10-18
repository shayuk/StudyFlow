import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { getMyTopicSummary, type TopicSummary } from './api';

const colorByStatus: Record<TopicSummary['status'], string> = {
  'חזק': 'bg-green-100 text-gray-800',
  'ממוצע': 'bg-yellow-100 text-gray-800',
  'דורש חיזוק': 'bg-red-100 text-gray-800',
};

export default function TopicsPanel() {
  const [topics, setTopics] = useState<TopicSummary[] | null>(null);
  useEffect(() => { (async () => setTopics(await getMyTopicSummary()))(); }, []);

  if (topics === null) return <div className="text-sm text-gray-500">טוען…</div>;
  if (!topics.length) return <EmptyState title="אין נתונים להצגה" subtitle="כשיתווספו פעילויות—נציג כאן מצב לפי נושאים." />;

  return (
    <div className="space-y-2" dir="rtl" aria-label="ניתוח נושאים">
      {topics.map(t => (
        <div key={t.label} className={`rounded-xl px-3 py-2 text-sm ${colorByStatus[t.status]}`}>
          <span className="font-medium">{t.label}</span><span className="mx-1">—</span><span>{t.status}</span>
        </div>
      ))}
    </div>
  );
}
