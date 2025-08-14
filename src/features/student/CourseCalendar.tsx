import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const mockEvents = [
  {
    title: 'שיעור: מבוא לסטטיסטיקה',
    start: new Date().toISOString().substring(0, 8) + '11T09:00:00',
    end: new Date().toISOString().substring(0, 8) + '11T11:00:00',
    backgroundColor: '#3b82f6', // blue-500
    borderColor: '#3b82f6'
  },
  {
    title: 'מטלה 1: סטטיסטיקה תיאורית',
    start: new Date().toISOString().substring(0, 8) + '11',
    end: new Date().toISOString().substring(0, 8) + '15',
    backgroundColor: '#f59e0b', // amber-500
    borderColor: '#f59e0b'
  },
  {
    title: 'שיעור: הסתברות',
    start: new Date().toISOString().substring(0, 8) + '13T14:00:00',
    end: new Date().toISOString().substring(0, 8) + '13T16:00:00',
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
];

export const CourseCalendar: React.FC = () => {
  return (
    <div className="bg-card p-4 rounded-lg shadow-md h-full text-text-primary">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={mockEvents}
        locale="he"
        direction="rtl"
        height="600px"
        allDaySlot={false}
      />
    </div>
  );
};
