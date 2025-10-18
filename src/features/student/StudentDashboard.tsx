import { useEffect, useState } from 'react';
import { useUiStore } from '../../store/ui.store.js';
import { CourseCard } from './CourseCard.js';
import { JoinCourseForm } from './JoinCourseForm.js';
import { getMyCourses } from '@/features/courses/api';
import type { CourseCard as CourseCardType } from '@/features/courses/types';

export const StudentDashboard = () => {
  const setCurrentContext = useUiStore((state) => state.setCurrentContext);
  const [courses, setCourses] = useState<CourseCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setCurrentContext('הקורסים שלי');
  }, [setCurrentContext]);

  useEffect(() => {
    let alive = true;
    getMyCourses(1, pageSize)
      .then(({ items, hasMore }) => { if (alive) { setCourses(items); setHasMore(hasMore); setPage(2); } })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (alive) setError(msg.includes('401') ? 'unauthorized' : 'failed');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const loadMore = async () => {
    const { items, hasMore } = await getMyCourses(page, pageSize);
    setCourses(prev => [...prev, ...items]);
    setHasMore(hasMore);
    if (hasMore) setPage(p => p + 1);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6">הקורסים שלי</h1>
      {loading ? (
        <div className="text-text-secondary">טוען...</div>
      ) : error === 'unauthorized' ? (
        <div className="text-text-secondary">יש להתחבר כדי לראות קורסים</div>
      ) : courses.length === 0 ? (
        <div className="text-text-secondary">אין קורסים עדיין</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                title={course.name}
                lecturer={course.instructor ?? ''}
                progress={course.progress ?? 0}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                className="rounded-xl bg-amber-400 px-5 py-2 font-semibold text-gray-900 hover:bg-amber-300 transition"
              >
                עוד…
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-12">
        <JoinCourseForm />
      </div>
    </div>
  );
};
