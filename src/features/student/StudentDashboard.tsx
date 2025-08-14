import { CourseCard } from './CourseCard';
import { JoinCourseForm } from './JoinCourseForm';

const mockCourses = [
  {
    title: 'סטטיסטיקה 101',
    lecturer: 'ד"ר כהן',
    progress: 70,
  },
  {
    title: 'תורת ההסתברות',
    lecturer: 'ד"ר לוי',
    progress: 40,
  },
  {
    title: 'מודלי רגרסיה',
    lecturer: 'ד"ר חן',
    progress: 55,
  },
];

export const StudentDashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6">הקורסים שלי</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCourses.map((course, index) => (
          <CourseCard
            key={index}
            title={course.title}
            lecturer={course.lecturer}
            progress={course.progress}
          />
        ))}
      </div>

      <div className="mt-12">
        <JoinCourseForm />
      </div>
    </div>
  );
};
