import React, { useEffect } from 'react';
import { useUiStore } from '../../store/ui.store.js';
import { CourseCalendar } from './CourseCalendar.js';
import { ProgressAnalytics } from './ProgressAnalytics.js';



export const StudentReportPage: React.FC = () => {
  const setCurrentContext = useUiStore((state) => state.setCurrentContext);

  useEffect(() => {
    setCurrentContext('דוח התקדמות');
  }, [setCurrentContext]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6">דוח התקדמות ולוח זמנים</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <ProgressAnalytics />
        </div>
        <div className="lg:col-span-1">
          <CourseCalendar />
        </div>
      </div>
    </div>
  );
};
