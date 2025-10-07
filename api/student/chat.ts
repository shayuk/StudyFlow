import type { VercelRequest, VercelResponse } from '@vercel/node';

// נטען את הקונטרולר מתוך ה־dist שנוצר בבילד של השרת
// הנתיב הוא מהקובץ הנוכחי (/api/student/chat.ts) חזרה לשורש ואז ל-server/dist/...
// אם תשני את מבנה התיקיות, עדכני את הנתיב בהתאם.
const { handleStudentTurn } = require('../../server/dist/controllers/studentController.js');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'INVALID_REQUEST_METHOD' });
      return;
    }

    const body = typeof req.body === 'string'
      ? (req.body ? JSON.parse(req.body) : {})
      : (req.body || {});

    const ctx = {
      userId: 'vercel-user',
      courseId: String(body.courseId ?? 'dev-course'),
      moduleId: String(body.moduleId ?? 'default'),
    };

    const message = String(body.message ?? '');
    const result = await handleStudentTurn(ctx, message);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('student/chat error:', err?.stack || err);
    res.status(500).json({ error: 'student_bot_error', message: 'Internal error' });
  }
}
