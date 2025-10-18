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

  useEffect(() => {
    setCurrentContext('הקורסים שלי');
  }, [setCurrentContext]);

  useEffect(() => {
    let alive = true;
    getMyCourses()
      .then((data) => { if (alive) setCourses(data); })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (alive) setError(msg.includes('401') ? 'unauthorized' : 'failed');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

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
      )}

      <div className="mt-12">
        <JoinCourseForm />
      </div>
    </div>
  );
};
