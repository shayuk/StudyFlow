import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../../store/notification.store.js';
import { useAuthStore } from '../../store/auth.store.js';

// Mock data fetching for student analytics
const getStudentAnalytics = (): Promise<any[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: 'סטטיסטיקה', 'רמת שליטה': 90 },
        { name: 'רגרסיה', 'רמת שליטה': 30 },
        { name: 'הסתברות', 'רמת שליטה': 60 },
        { name: 'אלגברה', 'רמת שליטה': 75 },
      ]);
    }, 1000);
  });
};

// This component is for logic only and does not render anything.
export const NotificationManager = () => {
  const { addNotification } = useNotificationStore();
    const { user } = useAuthStore();
  const hasGeneratedForUser = useRef<string | null>(null);

  useEffect(() => {
    // If we have a user and we haven't generated notifications for them yet
    if (user && hasGeneratedForUser.current !== user.id) {
      hasGeneratedForUser.current = user.id;

      const checkAndAdd = (message: string, type: 'alert' | 'info' | 'recommendation') => {
        const { notifications } = useNotificationStore.getState();
        if (!notifications.some(n => n.message === message)) {
          addNotification(message, type);
        }
      };

      if (user.role === 'lecturer') {
        const lecturerMessage = 'התראה: **נראה ש-3 תלמידים מתקשים עם מטלה 2**. כדאי לבדוק את ההתקדמות שלהם.';
        setTimeout(() => checkAndAdd(lecturerMessage, 'alert'), 1000);
      } else if (user.role === 'student') {
        const welcomeMessage = 'היי! אני רואה שהתחברת. **המטלה הבאה שלך היא \'מבוא לבדיקות תוכנה\'** והיא להגשה בעוד 3 ימים. שיהיה בהצלחה!';
        setTimeout(() => checkAndAdd(welcomeMessage, 'info'), 1000);

        getStudentAnalytics().then(analyticsData => {
          analyticsData.forEach(topic => {
            if (topic['רמת שליטה'] < 40) {
              const perfMessage = `שמנו לב שאתה מתקשה בנושא '${topic.name}'. כדאי לחזור על החומר ולתרגל.`;
              checkAndAdd(perfMessage, 'recommendation');
            }
          });
        });
      }
    } else if (!user) {
      // Reset when user logs out
      hasGeneratedForUser.current = null;
    }
  }, [user, addNotification]);

  return null; // This component does not render UI.
};
