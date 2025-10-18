import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EmptyState } from '@/components/EmptyState';
import { getMyEvents, type CalendarEvent } from '@/features/schedule/api';

interface CourseCalendarProps {
  events?: { title: string; start: Date | string; end: Date | string; backgroundColor?: string; borderColor?: string; }[];
}

export const CourseCalendar: React.FC<CourseCalendarProps> = ({ events }) => {
  const [loadedEvents, setLoadedEvents] = useState<CalendarEvent[] | null>(events ? [] : null);

  useEffect(() => {
    if (!events) {
      (async () => setLoadedEvents(await getMyEvents()))();
    }
  }, [events]);

  const calendarEvents = events ?? (Array.isArray(loadedEvents) ? loadedEvents : []);

  return (
    <div className="bg-card p-4 rounded-lg shadow-md h-full text-text-primary" dir="rtl">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={calendarEvents}
        locale="he"
        direction="rtl"
        height="600px"
        allDaySlot={false}
      />
      {events === undefined && loadedEvents !== null && loadedEvents.length === 0 && (
        <div className="mt-3"><EmptyState title="אין אירועים בלוח" subtitle="כשתיווצר מטלה או שיעור—נציג אותה כאן." /></div>
      )}
    </div>
  );
}
;
